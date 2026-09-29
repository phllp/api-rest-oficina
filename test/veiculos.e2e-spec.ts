import type { INestApplication } from '@nestjs/common';
import { StatusOrdemServico } from '@prisma/client';
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

interface VeiculoResposta {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  cor: string | null;
  clienteId: number;
  createdAt: string;
  updatedAt: string;
}

interface ListaVeiculos {
  page: number;
  limit: number;
  total: number;
  data: VeiculoResposta[];
}

const ANO_MAXIMO = new Date().getFullYear() + 1;

describe('Veiculos (e2e)', () => {
  let app: INestApplication<App>;
  let api: ClienteHttpAutenticado;
  let prisma: PrismaService;
  let clienteId: number;
  let outroClienteId: number;

  beforeAll(async () => {
    const criado = await criarAppDeTeste();
    app = criado.app as INestApplication<App>;
    api = criado.api;
    prisma = criado.prisma;
  });

  beforeEach(async () => {
    await limparDados(prisma);

    const dono = await prisma.cliente.create({
      data: {
        nome: 'Carla Menezes Duarte',
        cpf: '52998224725',
        email: 'carla@email.com',
        telefone: '47993034455',
      },
    });
    const segundo = await prisma.cliente.create({
      data: {
        nome: 'Diego Fontana Alves',
        cpf: '11144477735',
        email: 'diego@email.com',
        telefone: '47994045566',
      },
    });

    clienteId = dono.id;
    outroClienteId = segundo.id;
  });

  afterAll(async () => {
    await limparDados(prisma);
    await app.close();
  });

  /** Payload valido de veiculo para o cliente principal. */
  function novoVeiculo(extras: Record<string, unknown> = {}) {
    return {
      placa: 'ABC1D23',
      marca: 'Fiat',
      modelo: 'Argo Drive 1.0',
      ano: 2021,
      cor: 'Branco',
      clienteId,
      ...extras,
    };
  }

  describe('POST /veiculos', () => {
    it('cadastra e responde 201 com o veiculo criado', async () => {
      const resposta = await api
        .post('/veiculos')
        .send(novoVeiculo())
        .expect(201);

      const veiculo = resposta.body as VeiculoResposta;

      expect(veiculo).toMatchObject({
        placa: 'ABC1D23',
        marca: 'Fiat',
        modelo: 'Argo Drive 1.0',
        ano: 2021,
        cor: 'Branco',
        clienteId,
      });
      expect(veiculo.createdAt).toBeDefined();
      expect(veiculo.updatedAt).toBeDefined();
    });

    it('normaliza a placa enviada em minusculas e com hifen', async () => {
      const resposta = await api
        .post('/veiculos')
        .send(novoVeiculo({ placa: 'abc-1d23' }))
        .expect(201);

      expect((resposta.body as VeiculoResposta).placa).toBe('ABC1D23');
    });

    it('aceita veiculo sem cor', async () => {
      const resposta = await api
        .post('/veiculos')
        .send({
          placa: 'XYZ9876',
          marca: 'Ford',
          modelo: 'Ka SE 1.5',
          ano: 2018,
          clienteId,
        })
        .expect(201);

      expect((resposta.body as VeiculoResposta).cor).toBeNull();
    });

    it('responde 400 com detalhes por campo invalido', async () => {
      const resposta = await api
        .post('/veiculos')
        .send({
          placa: 'ABC-123',
          marca: 'F',
          modelo: '',
          ano: 1900,
          clienteId: 0,
        })
        .expect(400);

      const corpo = resposta.body as CorpoErro;

      expect(corpo.erro).toBe('DADOS_INVALIDOS');
      expect((corpo.detalhes ?? []).map((d) => d.campo).sort()).toEqual([
        'ano',
        'clienteId',
        'marca',
        'modelo',
        'placa',
      ]);
    });

    it(`rejeita ano acima de ${ANO_MAXIMO}`, async () => {
      const resposta = await api
        .post('/veiculos')
        .send(novoVeiculo({ ano: ANO_MAXIMO + 1 }))
        .expect(400);

      expect(
        ((resposta.body as CorpoErro).detalhes ?? []).map((d) => d.campo),
      ).toContain('ano');
    });

    it('responde 404 quando o clienteId nao existe', async () => {
      const resposta = await api
        .post('/veiculos')
        .send(novoVeiculo({ clienteId: 9999 }))
        .expect(404);

      expect(resposta.body).toEqual({
        status: 404,
        erro: 'RECURSO_NAO_ENCONTRADO',
        mensagem: 'Cliente com id 9999 não encontrado.',
      });
    });

    it('responde 409 quando a placa ja existe', async () => {
      await api.post('/veiculos').send(novoVeiculo()).expect(201);

      const resposta = await api
        .post('/veiculos')
        .send(novoVeiculo({ clienteId: outroClienteId }))
        .expect(409);

      expect(resposta.body).toEqual({
        status: 409,
        erro: 'REGISTRO_DUPLICADO',
        mensagem: 'Já existe um veículo com a placa ABC1D23.',
      });
    });
  });

  describe('GET /veiculos', () => {
    beforeEach(async () => {
      await prisma.veiculo.createMany({
        data: [
          {
            placa: 'RDF5G78',
            marca: 'Chevrolet',
            modelo: 'Onix LT 1.0',
            ano: 2019,
            cor: 'Prata',
            clienteId,
          },
          {
            placa: 'ABC1234',
            marca: 'Fiat',
            modelo: 'Argo Drive 1.0',
            ano: 2021,
            cor: 'Branco',
            clienteId,
          },
          {
            placa: 'JKL9A21',
            marca: 'Volkswagen',
            modelo: 'Gol 1.6',
            ano: 2016,
            cor: 'Cinza',
            clienteId: outroClienteId,
          },
        ],
      });
    });

    it('lista paginado e ordenado por placa', async () => {
      const resposta = await api.get('/veiculos').expect(200);

      const corpo = resposta.body as ListaVeiculos;

      expect(corpo).toMatchObject({ page: 1, limit: 10, total: 3 });
      expect(corpo.data.map((v) => v.placa)).toEqual([
        'ABC1234',
        'JKL9A21',
        'RDF5G78',
      ]);
    });

    it('respeita page e limit', async () => {
      const resposta = await api.get('/veiculos?page=2&limit=2').expect(200);

      const corpo = resposta.body as ListaVeiculos;

      expect(corpo).toMatchObject({ page: 2, limit: 2, total: 3 });
      expect(corpo.data.map((v) => v.placa)).toEqual(['RDF5G78']);
    });

    it('pagina alem do fim devolve 200 com data vazio', async () => {
      const resposta = await api.get('/veiculos?page=50&limit=10').expect(200);

      expect(resposta.body).toEqual({
        page: 50,
        limit: 10,
        total: 3,
        data: [],
      });
    });

    it('filtra por placa parcial, normalizando o valor informado', async () => {
      const resposta = await api.get('/veiculos?placa=abc').expect(200);

      const corpo = resposta.body as ListaVeiculos;

      expect(corpo.total).toBe(1);
      expect(corpo.data[0].placa).toBe('ABC1234');
    });

    it('filtra por marca parcial sem diferenciar maiusculas', async () => {
      const resposta = await api.get('/veiculos?marca=FIAT').expect(200);

      expect((resposta.body as ListaVeiculos).total).toBe(1);
    });

    it('filtra por modelo parcial sem diferenciar maiusculas', async () => {
      const resposta = await api.get('/veiculos?modelo=onix').expect(200);

      const corpo = resposta.body as ListaVeiculos;

      expect(corpo.total).toBe(1);
      expect(corpo.data[0].placa).toBe('RDF5G78');
    });

    it('filtra por ano exato', async () => {
      const resposta = await api.get('/veiculos?ano=2016').expect(200);

      const corpo = resposta.body as ListaVeiculos;

      expect(corpo.total).toBe(1);
      expect(corpo.data[0].ano).toBe(2016);
    });

    it('filtra por cliente_id', async () => {
      const resposta = await api
        .get(`/veiculos?cliente_id=${clienteId}`)
        .expect(200);

      const corpo = resposta.body as ListaVeiculos;

      expect(corpo.total).toBe(2);
      expect(corpo.data.every((v) => v.clienteId === clienteId)).toBe(true);
    });

    it('combina filtros', async () => {
      const resposta = await api
        .get(`/veiculos?cliente_id=${clienteId}&marca=chevrolet`)
        .expect(200);

      const corpo = resposta.body as ListaVeiculos;

      expect(corpo.total).toBe(1);
      expect(corpo.data[0].placa).toBe('RDF5G78');
    });

    it('responde 400 para cliente_id invalido', async () => {
      const resposta = await api.get('/veiculos?cliente_id=abc').expect(400);

      expect(
        ((resposta.body as CorpoErro).detalhes ?? []).map((d) => d.campo),
      ).toContain('cliente_id');
    });
  });

  describe('GET /veiculos/:id', () => {
    it('devolve o veiculo com o cliente resumido', async () => {
      const veiculo = await prisma.veiculo.create({
        data: {
          placa: 'ABC1234',
          marca: 'Fiat',
          modelo: 'Argo Drive 1.0',
          ano: 2021,
          cor: 'Branco',
          clienteId,
        },
      });

      const resposta = await api.get(`/veiculos/${veiculo.id}`).expect(200);

      expect(resposta.body).toMatchObject({
        id: veiculo.id,
        placa: 'ABC1234',
        cliente: {
          id: clienteId,
          nome: 'Carla Menezes Duarte',
          telefone: '47993034455',
        },
      });
      // O cliente resumido nao expoe CPF nem e-mail.
      expect(
        (resposta.body as { cliente: Record<string, unknown> }).cliente,
      ).not.toHaveProperty('cpf');
    });

    it('responde 404 quando o veiculo nao existe', async () => {
      const resposta = await api.get('/veiculos/9999').expect(404);

      expect(resposta.body).toEqual({
        status: 404,
        erro: 'RECURSO_NAO_ENCONTRADO',
        mensagem: 'Veículo com id 9999 não encontrado.',
      });
    });

    it('responde 400 para id invalido', async () => {
      const resposta = await api.get('/veiculos/-1').expect(400);

      expect((resposta.body as CorpoErro).erro).toBe('DADOS_INVALIDOS');
    });
  });

  describe('PUT /veiculos/:id', () => {
    it('substitui os dados e responde 200', async () => {
      const veiculo = await prisma.veiculo.create({
        data: novoVeiculo() as never,
      });

      const resposta = await api
        .put(`/veiculos/${veiculo.id}`)
        .send(
          novoVeiculo({
            placa: 'XYZ9876',
            marca: 'Ford',
            modelo: 'Ka SE 1.5',
            ano: 2018,
            cor: 'Vermelho',
          }),
        )
        .expect(200);

      expect(resposta.body).toMatchObject({
        id: veiculo.id,
        placa: 'XYZ9876',
        marca: 'Ford',
        cor: 'Vermelho',
      });
    });

    it('transfere o veiculo para outro cliente', async () => {
      const veiculo = await prisma.veiculo.create({
        data: novoVeiculo() as never,
      });

      const resposta = await api
        .put(`/veiculos/${veiculo.id}`)
        .send(novoVeiculo({ clienteId: outroClienteId }))
        .expect(200);

      expect((resposta.body as VeiculoResposta).clienteId).toBe(outroClienteId);
    });

    it('permite manter a propria placa', async () => {
      const veiculo = await prisma.veiculo.create({
        data: novoVeiculo() as never,
      });

      await api
        .put(`/veiculos/${veiculo.id}`)
        .send(novoVeiculo({ cor: 'Preto' }))
        .expect(200);
    });

    it('responde 409 quando a placa pertence a outro veiculo', async () => {
      const primeiro = await prisma.veiculo.create({
        data: novoVeiculo() as never,
      });
      await prisma.veiculo.create({
        data: novoVeiculo({ placa: 'XYZ9876' }) as never,
      });

      const resposta = await api
        .put(`/veiculos/${primeiro.id}`)
        .send(novoVeiculo({ placa: 'XYZ9876' }))
        .expect(409);

      expect((resposta.body as CorpoErro).mensagem).toBe(
        'Já existe um veículo com a placa XYZ9876.',
      );
    });

    it('responde 404 quando o veiculo nao existe', async () => {
      await api.put('/veiculos/9999').send(novoVeiculo()).expect(404);
    });

    it('responde 404 quando o novo clienteId nao existe', async () => {
      const veiculo = await prisma.veiculo.create({
        data: novoVeiculo() as never,
      });

      const resposta = await api
        .put(`/veiculos/${veiculo.id}`)
        .send(novoVeiculo({ clienteId: 9999 }))
        .expect(404);

      expect((resposta.body as CorpoErro).mensagem).toBe(
        'Cliente com id 9999 não encontrado.',
      );
    });
  });

  describe('DELETE /veiculos/:id', () => {
    it('exclui e responde 204 sem corpo', async () => {
      const veiculo = await prisma.veiculo.create({
        data: novoVeiculo() as never,
      });

      const resposta = await api.delete(`/veiculos/${veiculo.id}`).expect(204);

      expect(resposta.text).toBe('');
      await expect(
        prisma.veiculo.findUnique({ where: { id: veiculo.id } }),
      ).resolves.toBeNull();
    });

    it('responde 409 RECURSO_EM_USO informando a quantidade de ordens', async () => {
      const veiculo = await prisma.veiculo.create({
        data: novoVeiculo() as never,
      });
      await prisma.ordemServico.createMany({
        data: [
          {
            veiculoId: veiculo.id,
            status: StatusOrdemServico.ABERTA,
            descricaoProblema: 'Revisao',
          },
          {
            veiculoId: veiculo.id,
            status: StatusOrdemServico.CONCLUIDA,
            descricaoProblema: 'Troca de oleo',
          },
        ],
      });

      const resposta = await api.delete(`/veiculos/${veiculo.id}`).expect(409);

      expect(resposta.body).toEqual({
        status: 409,
        erro: 'RECURSO_EM_USO',
        mensagem:
          'O veículo possui 2 ordem(ns) de serviço e não pode ser excluído.',
      });
    });

    it('responde 404 quando o veiculo nao existe', async () => {
      await api.delete('/veiculos/9999').expect(404);
    });
  });
});
