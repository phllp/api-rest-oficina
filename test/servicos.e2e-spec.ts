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

interface ServicoResposta {
  id: number;
  descricao: string;
  preco: number;
  tempoEstimadoMin: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ListaServicos {
  page: number;
  limit: number;
  total: number;
  data: ServicoResposta[];
}

function novoServico(extras: Record<string, unknown> = {}) {
  return {
    descricao: 'Troca de oleo e filtro',
    preco: 189.9,
    tempoEstimadoMin: 45,
    ...extras,
  };
}

describe('Servicos (e2e)', () => {
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

  describe('POST /servicos', () => {
    it('cadastra com ativo true por padrao e devolve preco como number', async () => {
      const resposta = await api
        .post('/servicos')
        .send(novoServico())
        .expect(201);

      const servico = resposta.body as ServicoResposta;

      expect(servico).toMatchObject({
        descricao: 'Troca de oleo e filtro',
        preco: 189.9,
        tempoEstimadoMin: 45,
        ativo: true,
      });
      expect(typeof servico.preco).toBe('number');
      expect(servico.createdAt).toBeDefined();
    });

    it('aceita ativo false explicito', async () => {
      const resposta = await api
        .post('/servicos')
        .send(novoServico({ ativo: false }))
        .expect(201);

      expect((resposta.body as ServicoResposta).ativo).toBe(false);
    });

    it('responde 400 com detalhes por campo invalido', async () => {
      const resposta = await api
        .post('/servicos')
        .send({ descricao: 'ab', preco: 0, tempoEstimadoMin: 1 })
        .expect(400);

      const corpo = resposta.body as CorpoErro;

      expect(corpo.erro).toBe('DADOS_INVALIDOS');
      expect((corpo.detalhes ?? []).map((d) => d.campo).sort()).toEqual([
        'descricao',
        'preco',
        'tempoEstimadoMin',
      ]);
    });

    it('rejeita preco com mais de 2 casas decimais', async () => {
      const resposta = await api
        .post('/servicos')
        .send(novoServico({ preco: 189.999 }))
        .expect(400);

      const detalhes = (resposta.body as CorpoErro).detalhes ?? [];

      expect(detalhes.map((d) => d.campo)).toContain('preco');
      expect(detalhes.map((d) => d.mensagem).join(' ')).toContain(
        '2 casas decimais',
      );
    });

    it('rejeita preco acima do limite do Decimal(10,2)', async () => {
      await api
        .post('/servicos')
        .send(novoServico({ preco: 100000000 }))
        .expect(400);
    });

    it('responde 409 quando a descricao ja existe', async () => {
      await api.post('/servicos').send(novoServico()).expect(201);

      const resposta = await api
        .post('/servicos')
        .send(novoServico({ preco: 199.9 }))
        .expect(409);

      expect(resposta.body).toEqual({
        status: 409,
        erro: 'REGISTRO_DUPLICADO',
        mensagem: 'Já existe um serviço com esta descrição.',
      });
    });

    it('detecta descricao duplicada com outra caixa e espacos nas pontas', async () => {
      await api.post('/servicos').send(novoServico()).expect(201);

      await api
        .post('/servicos')
        .send(novoServico({ descricao: '  TROCA DE OLEO E FILTRO  ' }))
        .expect(409);
    });
  });

  describe('GET /servicos', () => {
    beforeEach(async () => {
      await prisma.servico.createMany({
        data: [
          {
            descricao: 'Alinhamento e balanceamento',
            preco: 149.0,
            tempoEstimadoMin: 60,
            ativo: true,
          },
          {
            descricao: 'Revisao do sistema de freios',
            preco: 480.0,
            tempoEstimadoMin: 120,
            ativo: true,
          },
          {
            descricao: 'Troca de embreagem',
            preco: 2350.0,
            tempoEstimadoMin: 420,
            ativo: true,
          },
          {
            descricao: 'Polimento tecnico',
            preco: 50.0,
            tempoEstimadoMin: 180,
            ativo: false,
          },
        ],
      });
    });

    it('lista paginado e ordenado por descricao por padrao', async () => {
      const resposta = await api.get('/servicos').expect(200);

      const corpo = resposta.body as ListaServicos;

      expect(corpo).toMatchObject({ page: 1, limit: 10, total: 4 });
      expect(corpo.data.map((s) => s.descricao)).toEqual([
        'Alinhamento e balanceamento',
        'Polimento tecnico',
        'Revisao do sistema de freios',
        'Troca de embreagem',
      ]);
      expect(corpo.data.every((s) => typeof s.preco === 'number')).toBe(true);
    });

    it('respeita page e limit', async () => {
      const resposta = await api.get('/servicos?page=2&limit=2').expect(200);

      const corpo = resposta.body as ListaServicos;

      expect(corpo).toMatchObject({ page: 2, limit: 2, total: 4 });
      expect(corpo.data.map((s) => s.descricao)).toEqual([
        'Revisao do sistema de freios',
        'Troca de embreagem',
      ]);
    });

    it('pagina alem do fim devolve 200 com data vazio', async () => {
      const resposta = await api.get('/servicos?page=9&limit=10').expect(200);

      expect(resposta.body).toEqual({ page: 9, limit: 10, total: 4, data: [] });
    });

    it('filtra por descricao parcial sem diferenciar maiusculas', async () => {
      const resposta = await api.get('/servicos?descricao=TROCA').expect(200);

      const corpo = resposta.body as ListaServicos;

      expect(corpo.total).toBe(1);
      expect(corpo.data[0].descricao).toBe('Troca de embreagem');
    });

    it('filtra pela faixa de preco com limites inclusivos', async () => {
      const resposta = await api
        .get('/servicos?preco_min=149&preco_max=480')
        .expect(200);

      const corpo = resposta.body as ListaServicos;

      expect(corpo.total).toBe(2);
      expect(corpo.data.map((s) => s.preco).sort((a, b) => a - b)).toEqual([
        149, 480,
      ]);
    });

    it('filtra somente por preco minimo', async () => {
      const resposta = await api.get('/servicos?preco_min=480').expect(200);

      const corpo = resposta.body as ListaServicos;

      expect(corpo.total).toBe(2);
      expect(corpo.data.every((s) => s.preco >= 480)).toBe(true);
    });

    it('filtra somente por preco maximo', async () => {
      const resposta = await api.get('/servicos?preco_max=149').expect(200);

      const corpo = resposta.body as ListaServicos;

      expect(corpo.total).toBe(2);
      expect(corpo.data.every((s) => s.preco <= 149)).toBe(true);
    });

    it('responde 400 quando preco_min e maior que preco_max', async () => {
      const resposta = await api
        .get('/servicos?preco_min=500&preco_max=100')
        .expect(400);

      const corpo = resposta.body as CorpoErro;

      expect(corpo.erro).toBe('DADOS_INVALIDOS');
      expect(corpo.detalhes).toEqual([
        {
          campo: 'preco_min',
          mensagem: 'preco_min não pode ser maior que preco_max',
        },
      ]);
    });

    it('filtra por ativo=false', async () => {
      const resposta = await api.get('/servicos?ativo=false').expect(200);

      const corpo = resposta.body as ListaServicos;

      expect(corpo.total).toBe(1);
      expect(corpo.data[0].descricao).toBe('Polimento tecnico');
    });

    it('responde 400 para ativo=abc', async () => {
      const resposta = await api.get('/servicos?ativo=abc').expect(400);

      expect(
        ((resposta.body as CorpoErro).detalhes ?? []).map((d) => d.campo),
      ).toContain('ativo');
    });

    it('ordena por preco crescente e decrescente', async () => {
      const crescente = await api
        .get('/servicos?ordenar_por=preco&ordem=asc')
        .expect(200);

      expect(
        (crescente.body as ListaServicos).data.map((s) => s.preco),
      ).toEqual([50, 149, 480, 2350]);

      const decrescente = await api
        .get('/servicos?ordenar_por=preco&ordem=desc')
        .expect(200);

      expect(
        (decrescente.body as ListaServicos).data.map((s) => s.preco),
      ).toEqual([2350, 480, 149, 50]);
    });

    it('ordena por tempo_estimado', async () => {
      const resposta = await api
        .get('/servicos?ordenar_por=tempo_estimado&ordem=asc')
        .expect(200);

      expect(
        (resposta.body as ListaServicos).data.map((s) => s.tempoEstimadoMin),
      ).toEqual([60, 120, 180, 420]);
    });

    it('ordena por descricao decrescente', async () => {
      const resposta = await api
        .get('/servicos?ordenar_por=descricao&ordem=desc')
        .expect(200);

      expect(
        (resposta.body as ListaServicos).data.map((s) => s.descricao),
      ).toEqual([
        'Troca de embreagem',
        'Revisao do sistema de freios',
        'Polimento tecnico',
        'Alinhamento e balanceamento',
      ]);
    });

    it.each(['valor', 'preço', 'PRECO'])(
      'responde 400 para ordenar_por=%s',
      async (valor) => {
        const resposta = await api
          .get(`/servicos?ordenar_por=${encodeURIComponent(valor)}`)
          .expect(400);

        expect(
          ((resposta.body as CorpoErro).detalhes ?? []).map((d) => d.campo),
        ).toContain('ordenar_por');
      },
    );

    it('responde 400 para ordem invalida', async () => {
      const resposta = await api.get('/servicos?ordem=crescente').expect(400);

      expect(
        ((resposta.body as CorpoErro).detalhes ?? []).map((d) => d.campo),
      ).toContain('ordem');
    });

    it('combina faixa de preco, situacao e ordenacao', async () => {
      const resposta = await api
        .get('/servicos?preco_min=100&ativo=true&ordenar_por=preco&ordem=desc')
        .expect(200);

      const corpo = resposta.body as ListaServicos;

      expect(corpo.data.map((s) => s.preco)).toEqual([2350, 480, 149]);
    });
  });

  describe('GET /servicos/:id', () => {
    it('devolve o servico com preco como number', async () => {
      const servico = await prisma.servico.create({
        data: {
          descricao: 'Troca de bateria 60Ah',
          preco: 620,
          tempoEstimadoMin: 30,
        },
      });

      const resposta = await api.get(`/servicos/${servico.id}`).expect(200);

      const corpo = resposta.body as ServicoResposta;

      expect(corpo).toMatchObject({ id: servico.id, preco: 620, ativo: true });
      expect(typeof corpo.preco).toBe('number');
    });

    it('responde 404 quando o servico nao existe', async () => {
      const resposta = await api.get('/servicos/9999').expect(404);

      expect(resposta.body).toEqual({
        status: 404,
        erro: 'RECURSO_NAO_ENCONTRADO',
        mensagem: 'Serviço com id 9999 não encontrado.',
      });
    });
  });

  describe('PUT /servicos/:id', () => {
    it('substitui os dados e responde 200', async () => {
      const servico = await prisma.servico.create({
        data: {
          descricao: 'Troca de oleo',
          preco: 189.9,
          tempoEstimadoMin: 45,
        },
      });

      const resposta = await api
        .put(`/servicos/${servico.id}`)
        .send({
          descricao: 'Troca de oleo sintetico',
          preco: 249.5,
          tempoEstimadoMin: 50,
          ativo: false,
        })
        .expect(200);

      expect(resposta.body).toMatchObject({
        id: servico.id,
        descricao: 'Troca de oleo sintetico',
        preco: 249.5,
        ativo: false,
      });
    });

    it('nao altera o precoUnitario de itens de ordens existentes', async () => {
      const servico = await prisma.servico.create({
        data: {
          descricao: 'Troca de oleo',
          preco: 189.9,
          tempoEstimadoMin: 45,
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
      const ordem = await prisma.ordemServico.create({
        data: {
          veiculoId: veiculo.id,
          descricaoProblema: 'Revisao',
          valorTotal: 189.9,
          itens: {
            create: [
              { servicoId: servico.id, quantidade: 1, precoUnitario: 189.9 },
            ],
          },
        },
      });

      await api
        .put(`/servicos/${servico.id}`)
        .send({
          descricao: 'Troca de oleo',
          preco: 249.5,
          tempoEstimadoMin: 45,
          ativo: true,
        })
        .expect(200);

      const item = await prisma.itemOrdemServico.findFirst({
        where: { ordemServicoId: ordem.id },
      });

      expect(item?.precoUnitario.toNumber()).toBe(189.9);
    });

    it('permite manter a propria descricao', async () => {
      const servico = await prisma.servico.create({
        data: {
          descricao: 'Troca de oleo',
          preco: 189.9,
          tempoEstimadoMin: 45,
        },
      });

      await api
        .put(`/servicos/${servico.id}`)
        .send({
          descricao: 'Troca de oleo',
          preco: 199.9,
          tempoEstimadoMin: 45,
          ativo: true,
        })
        .expect(200);
    });

    it('responde 409 quando a descricao pertence a outro servico', async () => {
      const primeiro = await prisma.servico.create({
        data: {
          descricao: 'Troca de oleo',
          preco: 189.9,
          tempoEstimadoMin: 45,
        },
      });
      await prisma.servico.create({
        data: { descricao: 'Alinhamento', preco: 149, tempoEstimadoMin: 60 },
      });

      const resposta = await api
        .put(`/servicos/${primeiro.id}`)
        .send({
          descricao: 'alinhamento',
          preco: 189.9,
          tempoEstimadoMin: 45,
          ativo: true,
        })
        .expect(409);

      expect((resposta.body as CorpoErro).mensagem).toBe(
        'Já existe um serviço com esta descrição.',
      );
    });

    it('responde 400 quando ativo e omitido (obrigatorio no PUT)', async () => {
      const servico = await prisma.servico.create({
        data: {
          descricao: 'Troca de oleo',
          preco: 189.9,
          tempoEstimadoMin: 45,
        },
      });

      const resposta = await api
        .put(`/servicos/${servico.id}`)
        .send(novoServico({ descricao: 'Troca de oleo' }))
        .expect(400);

      expect(
        ((resposta.body as CorpoErro).detalhes ?? []).map((d) => d.campo),
      ).toContain('ativo');
    });

    it('responde 404 quando o servico nao existe', async () => {
      await api
        .put('/servicos/9999')
        .send(novoServico({ ativo: true }))
        .expect(404);
    });
  });

  describe('DELETE /servicos/:id', () => {
    it('exclui e responde 204 sem corpo', async () => {
      const servico = await prisma.servico.create({
        data: {
          descricao: 'Polimento tecnico',
          preco: 50,
          tempoEstimadoMin: 180,
        },
      });

      const resposta = await api.delete(`/servicos/${servico.id}`).expect(204);

      expect(resposta.text).toBe('');
      await expect(
        prisma.servico.findUnique({ where: { id: servico.id } }),
      ).resolves.toBeNull();
    });

    it('responde 409 orientando a desativacao quando o servico esta em uma ordem', async () => {
      const servico = await prisma.servico.create({
        data: {
          descricao: 'Troca de oleo',
          preco: 189.9,
          tempoEstimadoMin: 45,
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
          descricaoProblema: 'Revisao',
          itens: {
            create: [
              { servicoId: servico.id, quantidade: 2, precoUnitario: 189.9 },
            ],
          },
        },
      });

      const resposta = await api.delete(`/servicos/${servico.id}`).expect(409);

      expect(resposta.body).toEqual({
        status: 409,
        erro: 'RECURSO_EM_USO',
        mensagem:
          'O serviço está lançado em 1 item(ns) de ordem(ns) de serviço e não pode ser excluído. ' +
          'Para retirá-lo do catálogo, altere o campo ativo para false.',
      });
    });

    it('responde 404 quando o servico nao existe', async () => {
      await api.delete('/servicos/9999').expect(404);
    });
  });
});
