import type { INestApplication } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import {
  criarAppDeTeste,
  limparDados,
  USUARIO_DE_TESTE,
  type ClienteHttpAutenticado,
} from './util-app-teste.js';

interface CorpoErro {
  status: number;
  erro: string;
  mensagem: string;
  detalhes?: { campo: string; mensagem: string }[];
}

interface LoginResposta {
  token: string;
  tipo: string;
  expiraEm: number;
}

/** Rota protegida usada nos testes de header/token. */
const ROTA_PROTEGIDA = '/clientes';

describe('Autenticacao (e2e)', () => {
  let app: INestApplication<App>;
  let api: ClienteHttpAutenticado;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let token: string;

  beforeAll(async () => {
    const criado = await criarAppDeTeste();
    app = criado.app as INestApplication<App>;
    api = criado.api;
    prisma = criado.prisma;
    jwtService = criado.jwtService;
    token = criado.token;
  });

  afterAll(async () => {
    await limparDados(prisma);
    await app.close();
  });

  /** Requisicao sem nenhum header de autenticacao. */
  function semToken() {
    return request(app.getHttpServer());
  }

  // -------------------------------------------------------------------------
  describe('POST /auth/login', () => {
    it('autentica o usuario de teste e devolve token, tipo e expiraEm', async () => {
      const resposta = await semToken()
        .post('/auth/login')
        .send({ email: USUARIO_DE_TESTE.email, senha: USUARIO_DE_TESTE.senha })
        .expect(200);

      const corpo = resposta.body as LoginResposta;

      expect(Object.keys(corpo).sort()).toEqual(['expiraEm', 'tipo', 'token']);
      expect(corpo.tipo).toBe('Bearer');
      expect(typeof corpo.expiraEm).toBe('number');
      expect(corpo.expiraEm).toBeGreaterThan(0);
      // JWT tem tres partes separadas por ponto
      expect(corpo.token.split('.')).toHaveLength(3);
    });

    it('aceita o e-mail em maiusculas (normalizado para minusculas)', async () => {
      await semToken()
        .post('/auth/login')
        .send({
          email: USUARIO_DE_TESTE.email.toUpperCase(),
          senha: USUARIO_DE_TESTE.senha,
        })
        .expect(200);
    });

    it('o token emitido funciona em uma rota protegida', async () => {
      const login = await semToken()
        .post('/auth/login')
        .send({ email: USUARIO_DE_TESTE.email, senha: USUARIO_DE_TESTE.senha })
        .expect(200);

      const { token: emitido } = login.body as LoginResposta;

      await semToken()
        .get(ROTA_PROTEGIDA)
        .set('Authorization', `Bearer ${emitido}`)
        .expect(200);
    });

    it('responde 401 CREDENCIAIS_INVALIDAS com senha errada', async () => {
      const resposta = await semToken()
        .post('/auth/login')
        .send({ email: USUARIO_DE_TESTE.email, senha: 'senha-errada' })
        .expect(401);

      expect(resposta.body).toEqual({
        status: 401,
        erro: 'CREDENCIAIS_INVALIDAS',
        mensagem: 'E-mail ou senha inválidos.',
      });
    });

    it('responde exatamente o mesmo erro para e-mail inexistente', async () => {
      const comEmailErrado = await semToken()
        .post('/auth/login')
        .send({ email: 'ninguem@oficina.com', senha: USUARIO_DE_TESTE.senha })
        .expect(401);

      const comSenhaErrada = await semToken()
        .post('/auth/login')
        .send({ email: USUARIO_DE_TESTE.email, senha: 'senha-errada' })
        .expect(401);

      expect(comEmailErrado.body).toEqual(comSenhaErrada.body);
    });

    it('envia WWW-Authenticate: Bearer no 401 de credenciais', async () => {
      const resposta = await semToken()
        .post('/auth/login')
        .send({ email: USUARIO_DE_TESTE.email, senha: 'senha-errada' })
        .expect(401);

      expect(resposta.headers['www-authenticate']).toBe('Bearer');
    });

    it('responde 400 com detalhes quando o corpo e invalido', async () => {
      const resposta = await semToken()
        .post('/auth/login')
        .send({ email: 'sem-arroba', senha: '' })
        .expect(400);

      const corpo = resposta.body as CorpoErro;

      expect(corpo.erro).toBe('DADOS_INVALIDOS');
      expect((corpo.detalhes ?? []).map((d) => d.campo).sort()).toEqual([
        'email',
        'senha',
      ]);
    });

    it('responde 400 para campo nao declarado no DTO', async () => {
      await semToken()
        .post('/auth/login')
        .send({
          email: USUARIO_DE_TESTE.email,
          senha: USUARIO_DE_TESTE.senha,
          perfil: 'admin',
        })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  describe('GET /auth/me', () => {
    it('devolve o usuario autenticado sem senhaHash', async () => {
      const resposta = await api.get('/auth/me').expect(200);

      expect(resposta.body).toMatchObject({
        nome: USUARIO_DE_TESTE.nome,
        email: USUARIO_DE_TESTE.email,
      });
      expect(typeof (resposta.body as { id: unknown }).id).toBe('number');
      expect(Object.keys(resposta.body as object).sort()).toEqual([
        'email',
        'id',
        'nome',
      ]);
      expect(resposta.body).not.toHaveProperty('senhaHash');
    });

    it('responde 401 sem token', async () => {
      await semToken().get('/auth/me').expect(401);
    });

    it('responde 401 TOKEN_INVALIDO quando o usuario do token nao existe mais', async () => {
      const tokenDeFantasma = jwtService.sign({
        sub: 999_999,
        email: 'removido@oficina.com',
      });

      const resposta = await semToken()
        .get('/auth/me')
        .set('Authorization', `Bearer ${tokenDeFantasma}`)
        .expect(401);

      expect(resposta.body).toMatchObject({
        erro: 'TOKEN_INVALIDO',
        mensagem:
          'O usuário deste token não existe mais. Faça login novamente.',
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('validacao do header e do token', () => {
    it('sem Authorization responde 401 NAO_AUTENTICADO', async () => {
      const resposta = await semToken().get(ROTA_PROTEGIDA).expect(401);

      expect(resposta.body).toEqual({
        status: 401,
        erro: 'NAO_AUTENTICADO',
        mensagem: 'Token de autenticação não informado.',
      });
      expect(resposta.headers['www-authenticate']).toBe('Bearer');
    });

    it.each([
      ['sem esquema', 'abc.def.ghi'],
      ['esquema errado', 'Basic dXN1YXJpbzpzZW5oYQ=='],
      ['bearer minusculo', 'bearer abc.def.ghi'],
      ['somente o esquema', 'Bearer'],
      ['partes demais', 'Bearer abc.def.ghi extra'],
    ])(
      'header %s responde 401 TOKEN_INVALIDO de formato',
      async (_caso, header) => {
        const resposta = await semToken()
          .get(ROTA_PROTEGIDA)
          .set('Authorization', header)
          .expect(401);

        expect(resposta.body).toEqual({
          status: 401,
          erro: 'TOKEN_INVALIDO',
          mensagem:
            'Formato do token inválido. Use: Authorization: Bearer <token>.',
        });
        expect(resposta.headers['www-authenticate']).toBe('Bearer');
      },
    );

    it('token malformado responde 401 "Token inválido."', async () => {
      const resposta = await semToken()
        .get(ROTA_PROTEGIDA)
        .set('Authorization', 'Bearer nao-e-um-jwt')
        .expect(401);

      expect(resposta.body).toMatchObject({
        erro: 'TOKEN_INVALIDO',
        mensagem: 'Token inválido.',
      });
    });

    it('token assinado com outro segredo responde 401 "Token inválido."', async () => {
      // Assinatura feita fora da aplicacao, com segredo diferente.
      const cabecalho = Buffer.from(
        JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
      ).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({ sub: 1, email: USUARIO_DE_TESTE.email }),
      ).toString('base64url');
      const tokenForjado = `${cabecalho}.${payload}.assinatura-invalida`;

      const resposta = await semToken()
        .get(ROTA_PROTEGIDA)
        .set('Authorization', `Bearer ${tokenForjado}`)
        .expect(401);

      expect(resposta.body).toMatchObject({
        erro: 'TOKEN_INVALIDO',
        mensagem: 'Token inválido.',
      });
    });

    it('token expirado responde 401 orientando novo login', async () => {
      const tokenExpirado = jwtService.sign(
        { sub: 1, email: USUARIO_DE_TESTE.email },
        { expiresIn: '-10s' },
      );

      const resposta = await semToken()
        .get(ROTA_PROTEGIDA)
        .set('Authorization', `Bearer ${tokenExpirado}`)
        .expect(401);

      expect(resposta.body).toEqual({
        status: 401,
        erro: 'TOKEN_INVALIDO',
        mensagem: 'Token expirado. Faça login novamente.',
      });
      expect(resposta.headers['www-authenticate']).toBe('Bearer');
    });

    it('token valido e aceito', async () => {
      await semToken()
        .get(ROTA_PROTEGIDA)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  // -------------------------------------------------------------------------
  describe('rotas publicas', () => {
    it('GET /health nao exige token', async () => {
      await semToken()
        .get('/health')
        .expect(200)
        .expect({ status: 'ok', database: 'up' });
    });

    it('POST /auth/login nao exige token', async () => {
      await semToken()
        .post('/auth/login')
        .send({ email: USUARIO_DE_TESTE.email, senha: USUARIO_DE_TESTE.senha })
        .expect(200);
    });

    it('a documentacao em /docs continua acessivel sem token', async () => {
      const resposta = await semToken().get('/docs').expect(200);

      expect(resposta.headers['content-type']).toContain('text/html');
    });

    it('/docs-json continua acessivel sem token', async () => {
      await semToken().get('/docs-json').expect(200);
    });
  });

  // -------------------------------------------------------------------------
  // Varredura: toda rota documentada como protegida deve recusar acesso sem
  // token. A lista vem do proprio documento OpenAPI, entao endpoints novos
  // entram nesta cobertura automaticamente.
  // -------------------------------------------------------------------------
  describe('cobertura de todas as rotas protegidas', () => {
    interface Operacao {
      metodo: 'get' | 'post' | 'put' | 'patch' | 'delete';
      caminho: string;
      protegida: boolean;
    }

    function listarOperacoes(): Operacao[] {
      const documento = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().addBearerAuth().build(),
      );

      const operacoes: Operacao[] = [];

      for (const [caminho, metodos] of Object.entries(documento.paths)) {
        for (const [metodo, operacao] of Object.entries(
          metodos as Record<string, { security?: unknown[] }>,
        )) {
          operacoes.push({
            metodo: metodo as Operacao['metodo'],
            caminho,
            protegida: (operacao.security ?? []).length > 0,
          });
        }
      }

      return operacoes;
    }

    /** Troca os parametros de rota por um id qualquer. */
    function comIdDeExemplo(caminho: string): string {
      return caminho.replace(/\{[^}]+\}/g, '1');
    }

    const operacoes = [] as Operacao[];

    beforeAll(() => {
      operacoes.push(...listarOperacoes());
    });

    it('encontrou as operacoes do documento OpenAPI', () => {
      expect(operacoes.length).toBeGreaterThanOrEqual(33);
      expect(
        operacoes.filter((o) => o.protegida).length,
      ).toBeGreaterThanOrEqual(31);
    });

    it('somente /health e /auth/login ficam abertos', () => {
      const abertas = operacoes
        .filter((operacao) => !operacao.protegida)
        .map(
          (operacao) => `${operacao.metodo.toUpperCase()} ${operacao.caminho}`,
        )
        .sort();

      expect(abertas).toEqual(['GET /health', 'POST /auth/login']);
    });

    it('toda rota protegida responde 401 NAO_AUTENTICADO sem token', async () => {
      const protegidas = operacoes.filter((operacao) => operacao.protegida);
      const falhas: string[] = [];

      for (const operacao of protegidas) {
        const url = comIdDeExemplo(operacao.caminho);
        const resposta = await semToken()[operacao.metodo](url).send({});
        const corpo = resposta.body as CorpoErro;

        const rotulo = `${operacao.metodo.toUpperCase()} ${operacao.caminho}`;

        if (resposta.status !== 401) {
          falhas.push(`${rotulo} respondeu ${resposta.status}, esperado 401`);
          continue;
        }

        if (corpo.erro !== 'NAO_AUTENTICADO') {
          falhas.push(`${rotulo} respondeu erro ${corpo.erro}`);
        }

        if (resposta.headers['www-authenticate'] !== 'Bearer') {
          falhas.push(`${rotulo} nao enviou WWW-Authenticate: Bearer`);
        }
      }

      expect(falhas).toEqual([]);
    });
  });
});
