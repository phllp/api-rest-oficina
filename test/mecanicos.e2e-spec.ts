import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import {
  criarAppDeTeste,
  limparDados,
  type ClienteHttpAutenticado,
} from './util-app-teste.js';

interface CorpoErro {
  status: number;
  erro: string;
  mensagem: string;
  detalhes?: { campo: string; mensagem: string }[];
}

interface MecanicoResposta {
  id: number;
  nome: string;
  especialidade: string;
  telefone: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ListaMecanicos {
  page: number;
  limit: number;
  total: number;
  data: MecanicoResposta[];
}

function novoMecanico(extras: Record<string, unknown> = {}) {
  return {
    nome: 'Adilson Moita',
    especialidade: 'Motor e injecao eletronica',
    telefone: '(47) 3344-1001',
    ...extras,
  };
}

describe('Mecanicos (e2e)', () => {
  let app: INestApplication<App>;
  let api: ClienteHttpAutenticado;
  let prisma: PrismaService;

  beforeAll(async () => {
    const criado = await criarAppDeTeste();
    app = criado.app as INestApplication<App>;
    api = criado.api;
    prisma = criado.prisma;
  });

  beforeEach(async () => {
    await limparDados(prisma);
  });

  afterAll(async () => {
    await limparDados(prisma);
    await app.close();
  });

  describe('POST /mecanicos', () => {
    it('cadastra com ativo true por padrao e normaliza o telefone', async () => {
      const resposta = await api
        .post('/mecanicos')
        .send(novoMecanico())
        .expect(201);

      const mecanico = resposta.body as MecanicoResposta;

      expect(mecanico).toMatchObject({
        nome: 'Adilson Moita',
        especialidade: 'Motor e injecao eletronica',
        telefone: '4733441001',
        ativo: true,
      });
      expect(mecanico.createdAt).toBeDefined();
      expect(mecanico.updatedAt).toBeDefined();
    });

    it('aceita ativo false explicito', async () => {
      const resposta = await api
        .post('/mecanicos')
        .send(novoMecanico({ ativo: false }))
        .expect(201);

      expect((resposta.body as MecanicoResposta).ativo).toBe(false);
    });

    it('responde 400 com detalhes por campo invalido', async () => {
      const resposta = await api
        .post('/mecanicos')
        .send({
          nome: 'A',
          especialidade: 'X',
          telefone: '123',
          ativo: 'talvez',
        })
        .expect(400);

      const corpo = resposta.body as CorpoErro;

      expect(corpo.erro).toBe('DADOS_INVALIDOS');
      expect((corpo.detalhes ?? []).map((d) => d.campo).sort()).toEqual([
        'ativo',
        'especialidade',
        'nome',
        'telefone',
      ]);
    });
  });

  describe('GET /mecanicos', () => {
    beforeEach(async () => {
      await prisma.mecanico.createMany({
        data: [
          {
            nome: 'Adilson Moita',
            especialidade: 'Motor e injecao eletronica',
            telefone: '4733441001',
            ativo: true,
          },
          {
            nome: 'Cleber Ramos',
            especialidade: 'Suspensao e freios',
            telefone: '4733441002',
            ativo: true,
          },
          {
            nome: 'Sergio Bonfim',
            especialidade: 'Funilaria e pintura',
            telefone: '4733441005',
            ativo: false,
          },
        ],
      });
    });

    it('lista paginado e ordenado por nome', async () => {
      const resposta = await api.get('/mecanicos').expect(200);

      const corpo = resposta.body as ListaMecanicos;

      expect(corpo).toMatchObject({ page: 1, limit: 10, total: 3 });
      expect(corpo.data.map((m) => m.nome)).toEqual([
        'Adilson Moita',
        'Cleber Ramos',
        'Sergio Bonfim',
      ]);
    });

    it('respeita page e limit', async () => {
      const resposta = await api.get('/mecanicos?page=2&limit=2').expect(200);

      const corpo = resposta.body as ListaMecanicos;

      expect(corpo).toMatchObject({ page: 2, limit: 2, total: 3 });
      expect(corpo.data.map((m) => m.nome)).toEqual(['Sergio Bonfim']);
    });

    it('pagina alem do fim devolve 200 com data vazio', async () => {
      const resposta = await api.get('/mecanicos?page=10&limit=10').expect(200);

      expect(resposta.body).toEqual({
        page: 10,
        limit: 10,
        total: 3,
        data: [],
      });
    });

    it('filtra por nome parcial sem diferenciar maiusculas', async () => {
      const resposta = await api.get('/mecanicos?nome=CLEBER').expect(200);

      const corpo = resposta.body as ListaMecanicos;

      expect(corpo.total).toBe(1);
      expect(corpo.data[0].nome).toBe('Cleber Ramos');
    });

    it('filtra por especialidade parcial sem diferenciar maiusculas', async () => {
      const resposta = await api
        .get('/mecanicos?especialidade=FREIOS')
        .expect(200);

      expect((resposta.body as ListaMecanicos).total).toBe(1);
    });

    it('filtra somente os ativos com ativo=true', async () => {
      const resposta = await api.get('/mecanicos?ativo=true').expect(200);

      const corpo = resposta.body as ListaMecanicos;

      expect(corpo.total).toBe(2);
      expect(corpo.data.every((m) => m.ativo)).toBe(true);
    });

    it('filtra somente os inativos com ativo=false', async () => {
      const resposta = await api.get('/mecanicos?ativo=false').expect(200);

      const corpo = resposta.body as ListaMecanicos;

      expect(corpo.total).toBe(1);
      expect(corpo.data[0]).toMatchObject({
        nome: 'Sergio Bonfim',
        ativo: false,
      });
    });

    it.each(['abc', '1', 'TRUE', 'sim'])(
      'responde 400 para ativo=%s',
      async (valor) => {
        const resposta = await api.get(`/mecanicos?ativo=${valor}`).expect(400);

        const corpo = resposta.body as CorpoErro;

        expect(corpo.erro).toBe('DADOS_INVALIDOS');
        expect((corpo.detalhes ?? []).map((d) => d.campo)).toContain('ativo');
      },
    );
  });

  describe('GET /mecanicos/:id', () => {
    it('devolve o mecanico com totalOrdensServico', async () => {
      const mecanico = await prisma.mecanico.create({
        data: {
          nome: 'Adilson Moita',
          especialidade: 'Motor',
          telefone: '4733441001',
        },
      });
      const cliente = await prisma.cliente.create({
        data: {
          nome: 'Cliente Teste',
          cpf: '52998224725',
          email: 'cliente@email.com',
          telefone: '47991012233',
        },
      });
      const veiculo = await prisma.veiculo.create({
        data: {
          placa: 'ABC1234',
          marca: 'Fiat',
          modelo: 'Argo',
          ano: 2021,
          clienteId: cliente.id,
        },
      });
      await prisma.ordemServico.createMany({
        data: [
          {
            veiculoId: veiculo.id,
            mecanicoId: mecanico.id,
            descricaoProblema: 'Revisao',
          },
          {
            veiculoId: veiculo.id,
            mecanicoId: mecanico.id,
            descricaoProblema: 'Troca de oleo',
          },
        ],
      });

      const resposta = await api.get(`/mecanicos/${mecanico.id}`).expect(200);

      expect(resposta.body).toMatchObject({
        id: mecanico.id,
        nome: 'Adilson Moita',
        totalOrdensServico: 2,
      });
      expect(resposta.body).not.toHaveProperty('_count');
    });

    it('devolve totalOrdensServico zero para mecanico sem ordens', async () => {
      const mecanico = await prisma.mecanico.create({
        data: { nome: 'Novo', especialidade: 'Geral', telefone: '4733441009' },
      });

      const resposta = await api.get(`/mecanicos/${mecanico.id}`).expect(200);

      expect(resposta.body).toMatchObject({ totalOrdensServico: 0 });
    });

    it('responde 404 quando o mecanico nao existe', async () => {
      const resposta = await api.get('/mecanicos/9999').expect(404);

      expect(resposta.body).toEqual({
        status: 404,
        erro: 'RECURSO_NAO_ENCONTRADO',
        mensagem: 'Mecânico com id 9999 não encontrado.',
      });
    });

    it('responde 400 para id invalido', async () => {
      const resposta = await api.get('/mecanicos/abc').expect(400);

      expect((resposta.body as CorpoErro).erro).toBe('DADOS_INVALIDOS');
    });
  });

  describe('PUT /mecanicos/:id', () => {
    it('substitui os dados e responde 200', async () => {
      const mecanico = await prisma.mecanico.create({
        data: {
          nome: 'Adilson Moita',
          especialidade: 'Motor',
          telefone: '4733441001',
        },
      });

      const resposta = await api
        .put(`/mecanicos/${mecanico.id}`)
        .send({
          nome: 'Adilson Moita Junior',
          especialidade: 'Motor e cambio',
          telefone: '47991010101',
          ativo: false,
        })
        .expect(200);

      expect(resposta.body).toMatchObject({
        id: mecanico.id,
        nome: 'Adilson Moita Junior',
        especialidade: 'Motor e cambio',
        ativo: false,
      });
    });

    it('responde 400 quando ativo e omitido (obrigatorio no PUT)', async () => {
      const mecanico = await prisma.mecanico.create({
        data: {
          nome: 'Adilson Moita',
          especialidade: 'Motor',
          telefone: '4733441001',
        },
      });

      const resposta = await api
        .put(`/mecanicos/${mecanico.id}`)
        .send(novoMecanico())
        .expect(400);

      expect(
        ((resposta.body as CorpoErro).detalhes ?? []).map((d) => d.campo),
      ).toContain('ativo');
    });

    it('responde 404 quando o mecanico nao existe', async () => {
      await api
        .put('/mecanicos/9999')
        .send(novoMecanico({ ativo: true }))
        .expect(404);
    });
  });

  describe('DELETE /mecanicos/:id', () => {
    it('exclui e responde 204 sem corpo', async () => {
      const mecanico = await prisma.mecanico.create({
        data: {
          nome: 'Sergio Bonfim',
          especialidade: 'Funilaria',
          telefone: '4733441005',
          ativo: false,
        },
      });

      const resposta = await api
        .delete(`/mecanicos/${mecanico.id}`)
        .expect(204);

      expect(resposta.text).toBe('');
      await expect(
        prisma.mecanico.findUnique({ where: { id: mecanico.id } }),
      ).resolves.toBeNull();
    });

    it('responde 409 orientando a desativacao quando possui ordens', async () => {
      const mecanico = await prisma.mecanico.create({
        data: {
          nome: 'Adilson Moita',
          especialidade: 'Motor',
          telefone: '4733441001',
        },
      });
      const cliente = await prisma.cliente.create({
        data: {
          nome: 'Cliente Teste',
          cpf: '52998224725',
          email: 'cliente@email.com',
          telefone: '47991012233',
        },
      });
      const veiculo = await prisma.veiculo.create({
        data: {
          placa: 'ABC1234',
          marca: 'Fiat',
          modelo: 'Argo',
          ano: 2021,
          clienteId: cliente.id,
        },
      });
      await prisma.ordemServico.create({
        data: {
          veiculoId: veiculo.id,
          mecanicoId: mecanico.id,
          descricaoProblema: 'Revisao',
        },
      });

      const resposta = await api
        .delete(`/mecanicos/${mecanico.id}`)
        .expect(409);

      expect(resposta.body).toEqual({
        status: 409,
        erro: 'RECURSO_EM_USO',
        mensagem:
          'O mecânico possui 1 ordem(ns) de serviço vinculada(s) e não pode ser excluído. ' +
          'Para removê-lo das novas ordens, altere o campo ativo para false.',
      });
    });

    it('responde 404 quando o mecanico nao existe', async () => {
      await api.delete('/mecanicos/9999').expect(404);
    });
  });
});
