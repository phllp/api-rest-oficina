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

interface ClienteResposta {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  createdAt: string;
  updatedAt: string;
}

interface ListaClientes {
  page: number;
  limit: number;
  total: number;
  data: ClienteResposta[];
}

/** CPFs validos usados nos testes. */
const CPFS = [
  '52998224725',
  '11144477735',
  '39047371712',
  '23456789092',
  '34567890129',
];

function novoCliente(indice = 0, extras: Record<string, unknown> = {}) {
  return {
    nome: `Cliente Teste ${indice + 1}`,
    cpf: CPFS[indice],
    email: `cliente.teste.${indice + 1}@email.com`,
    telefone: `4799101223${indice}`,
    ...extras,
  };
}

describe('Clientes (e2e)', () => {
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

  describe('POST /clientes', () => {
    it('cadastra e responde 201 com o cliente criado', async () => {
      const resposta = await api
        .post('/clientes')
        .send(novoCliente(0))
        .expect(201);

      const cliente = resposta.body as ClienteResposta;

      expect(cliente).toMatchObject({
        nome: 'Cliente Teste 1',
        cpf: '52998224725',
        email: 'cliente.teste.1@email.com',
        telefone: '47991012230',
      });
      expect(cliente.id).toBeGreaterThan(0);
      expect(cliente.createdAt).toBeDefined();
      expect(cliente.updatedAt).toBeDefined();
    });

    it('normaliza CPF com mascara, e-mail em maiusculas e telefone formatado', async () => {
      const resposta = await api
        .post('/clientes')
        .send({
          nome: '  Maria Silva  ',
          cpf: '529.982.247-25',
          email: 'MARIA@EMAIL.COM',
          telefone: '(47) 99101-2233',
        })
        .expect(201);

      expect(resposta.body).toMatchObject({
        nome: 'Maria Silva',
        cpf: '52998224725',
        email: 'maria@email.com',
        telefone: '47991012233',
      });
    });

    it('responde 400 com detalhes por campo invalido', async () => {
      const resposta = await api
        .post('/clientes')
        .send({
          nome: 'A',
          cpf: '12345678900',
          email: 'sem-arroba',
          telefone: '123',
        })
        .expect(400);

      const corpo = resposta.body as CorpoErro;

      expect(corpo).toMatchObject({
        status: 400,
        erro: 'DADOS_INVALIDOS',
        mensagem: 'Os dados enviados são inválidos.',
      });
      expect((corpo.detalhes ?? []).map((d) => d.campo).sort()).toEqual([
        'cpf',
        'email',
        'nome',
        'telefone',
      ]);
    });

    it('responde 400 quando um campo nao declarado e enviado', async () => {
      const resposta = await api
        .post('/clientes')
        .send(novoCliente(0, { apelido: 'Teste' }))
        .expect(400);

      expect((resposta.body as CorpoErro).erro).toBe('DADOS_INVALIDOS');
    });

    it('responde 409 REGISTRO_DUPLICADO para CPF repetido', async () => {
      await api.post('/clientes').send(novoCliente(0)).expect(201);

      const resposta = await api
        .post('/clientes')
        .send(novoCliente(0, { email: 'outro@email.com' }))
        .expect(409);

      expect(resposta.body).toEqual({
        status: 409,
        erro: 'REGISTRO_DUPLICADO',
        mensagem: 'Já existe um cliente com este CPF.',
      });
    });

    it('responde 409 REGISTRO_DUPLICADO para e-mail repetido', async () => {
      await api.post('/clientes').send(novoCliente(0)).expect(201);

      const resposta = await api
        .post('/clientes')
        .send(novoCliente(1, { email: 'cliente.teste.1@email.com' }))
        .expect(409);

      expect(resposta.body).toMatchObject({
        erro: 'REGISTRO_DUPLICADO',
        mensagem: 'Já existe um cliente com este e-mail.',
      });
    });
  });

  describe('GET /clientes', () => {
    beforeEach(async () => {
      await prisma.cliente.createMany({
        data: [
          {
            nome: 'Ana Paula Ribeiro',
            cpf: CPFS[0],
            email: 'ana@email.com',
            telefone: '47991012233',
          },
          {
            nome: 'Bruno Carvalho',
            cpf: CPFS[1],
            email: 'bruno@email.com',
            telefone: '47992023344',
          },
          {
            nome: 'Carla Menezes',
            cpf: CPFS[2],
            email: 'carla@outro.com',
            telefone: '47993034455',
          },
        ],
      });
    });

    it('lista paginado, ordenado por nome, com os padroes page=1 e limit=10', async () => {
      const resposta = await api.get('/clientes').expect(200);

      const corpo = resposta.body as ListaClientes;

      expect(corpo).toMatchObject({ page: 1, limit: 10, total: 3 });
      expect(corpo.data.map((c) => c.nome)).toEqual([
        'Ana Paula Ribeiro',
        'Bruno Carvalho',
        'Carla Menezes',
      ]);
    });

    it('respeita page e limit', async () => {
      const resposta = await api.get('/clientes?page=2&limit=2').expect(200);

      const corpo = resposta.body as ListaClientes;

      expect(corpo).toMatchObject({ page: 2, limit: 2, total: 3 });
      expect(corpo.data).toHaveLength(1);
      expect(corpo.data[0].nome).toBe('Carla Menezes');
    });

    it('pagina alem do fim devolve 200 com data vazio', async () => {
      const resposta = await api.get('/clientes?page=99&limit=10').expect(200);

      expect(resposta.body).toEqual({
        page: 99,
        limit: 10,
        total: 3,
        data: [],
      });
    });

    it('filtra por nome parcial sem diferenciar maiusculas', async () => {
      const resposta = await api.get('/clientes?nome=ANA').expect(200);

      const corpo = resposta.body as ListaClientes;

      expect(corpo.total).toBe(1);
      expect(corpo.data[0].nome).toBe('Ana Paula Ribeiro');
    });

    it('filtra por cpf exato aceitando mascara', async () => {
      const resposta = await api
        .get('/clientes?cpf=529.982.247-25')
        .expect(200);

      const corpo = resposta.body as ListaClientes;

      expect(corpo.total).toBe(1);
      expect(corpo.data[0].cpf).toBe(CPFS[0]);
    });

    it('filtra por email parcial sem diferenciar maiusculas', async () => {
      const resposta = await api.get('/clientes?email=EMAIL.COM').expect(200);

      expect((resposta.body as ListaClientes).total).toBe(2);
    });

    it('responde 400 para page ou limit fora da faixa', async () => {
      const resposta = await api.get('/clientes?page=0&limit=500').expect(400);

      const campos = ((resposta.body as CorpoErro).detalhes ?? []).map(
        (d) => d.campo,
      );

      expect(campos).toEqual(expect.arrayContaining(['page', 'limit']));
    });
  });

  describe('GET /clientes/:id', () => {
    it('devolve o cliente com os veiculos resumidos', async () => {
      const cliente = await prisma.cliente.create({ data: novoCliente(0) });
      await prisma.veiculo.create({
        data: {
          placa: 'ABC1234',
          marca: 'Fiat',
          modelo: 'Argo Drive 1.0',
          ano: 2021,
          cor: 'Branco',
          clienteId: cliente.id,
        },
      });

      const resposta = await api.get(`/clientes/${cliente.id}`).expect(200);

      expect(resposta.body).toMatchObject({
        id: cliente.id,
        veiculos: [
          { placa: 'ABC1234', marca: 'Fiat', modelo: 'Argo Drive 1.0' },
        ],
      });
      // O resumo nao expoe campos fora do documentado.
      expect(
        (resposta.body as { veiculos: Record<string, unknown>[] }).veiculos[0],
      ).not.toHaveProperty('ano');
    });

    it('responde 404 quando o cliente nao existe', async () => {
      const resposta = await api.get('/clientes/9999').expect(404);

      expect(resposta.body).toEqual({
        status: 404,
        erro: 'RECURSO_NAO_ENCONTRADO',
        mensagem: 'Cliente com id 9999 não encontrado.',
      });
    });

    it('responde 400 para id invalido', async () => {
      const resposta = await api.get('/clientes/abc').expect(400);

      expect(resposta.body).toMatchObject({
        erro: 'DADOS_INVALIDOS',
        mensagem: 'O parâmetro id deve ser um número inteiro positivo.',
      });
    });
  });

  describe('GET /clientes/:id/veiculos', () => {
    it('devolve os veiculos do cliente ordenados por placa', async () => {
      const cliente = await prisma.cliente.create({ data: novoCliente(0) });
      await prisma.veiculo.createMany({
        data: [
          {
            placa: 'RDF5G78',
            marca: 'Chevrolet',
            modelo: 'Onix LT 1.0',
            ano: 2019,
            cor: 'Prata',
            clienteId: cliente.id,
          },
          {
            placa: 'ABC1234',
            marca: 'Fiat',
            modelo: 'Argo Drive 1.0',
            ano: 2021,
            cor: 'Branco',
            clienteId: cliente.id,
          },
        ],
      });

      const resposta = await api
        .get(`/clientes/${cliente.id}/veiculos`)
        .expect(200);

      const veiculos = resposta.body as {
        placa: string;
        ano: number;
        cor: string | null;
      }[];

      expect(veiculos.map((v) => v.placa)).toEqual(['ABC1234', 'RDF5G78']);
      expect(veiculos[0]).toMatchObject({ ano: 2021, cor: 'Branco' });
    });

    it('devolve array vazio quando o cliente nao tem veiculos', async () => {
      const cliente = await prisma.cliente.create({ data: novoCliente(0) });

      const resposta = await api
        .get(`/clientes/${cliente.id}/veiculos`)
        .expect(200);

      expect(resposta.body).toEqual([]);
    });

    it('responde 404 quando o cliente nao existe', async () => {
      const resposta = await api.get('/clientes/9999/veiculos').expect(404);

      expect((resposta.body as CorpoErro).erro).toBe('RECURSO_NAO_ENCONTRADO');
    });
  });

  describe('PUT /clientes/:id', () => {
    it('substitui os dados e responde 200', async () => {
      const cliente = await prisma.cliente.create({ data: novoCliente(0) });

      const resposta = await api
        .put(`/clientes/${cliente.id}`)
        .send({
          nome: 'Nome Atualizado',
          cpf: CPFS[1],
          email: 'atualizado@email.com',
          telefone: '4788887777',
        })
        .expect(200);

      expect(resposta.body).toMatchObject({
        id: cliente.id,
        nome: 'Nome Atualizado',
        cpf: CPFS[1],
        email: 'atualizado@email.com',
      });
    });

    it('permite manter o proprio CPF e e-mail', async () => {
      const cliente = await prisma.cliente.create({ data: novoCliente(0) });

      await api
        .put(`/clientes/${cliente.id}`)
        .send(novoCliente(0, { nome: 'Mesmo CPF' }))
        .expect(200);
    });

    it('responde 409 quando o CPF pertence a outro cliente', async () => {
      const primeiro = await prisma.cliente.create({ data: novoCliente(0) });
      await prisma.cliente.create({ data: novoCliente(1) });

      const resposta = await api
        .put(`/clientes/${primeiro.id}`)
        .send(novoCliente(1, { nome: 'Tentando roubar o CPF' }))
        .expect(409);

      expect((resposta.body as CorpoErro).mensagem).toBe(
        'Já existe um cliente com este CPF.',
      );
    });

    it('responde 404 quando o cliente nao existe', async () => {
      await api.put('/clientes/9999').send(novoCliente(0)).expect(404);
    });

    it('responde 400 quando falta um campo obrigatorio (PUT e substituicao total)', async () => {
      const cliente = await prisma.cliente.create({ data: novoCliente(0) });

      const resposta = await api
        .put(`/clientes/${cliente.id}`)
        .send({ nome: 'Somente o nome' })
        .expect(400);

      const campos = ((resposta.body as CorpoErro).detalhes ?? []).map(
        (d) => d.campo,
      );

      expect(campos).toEqual(
        expect.arrayContaining(['cpf', 'email', 'telefone']),
      );
    });
  });

  describe('DELETE /clientes/:id', () => {
    it('exclui e responde 204 sem corpo', async () => {
      const cliente = await prisma.cliente.create({ data: novoCliente(0) });

      const resposta = await api.delete(`/clientes/${cliente.id}`).expect(204);

      expect(resposta.text).toBe('');
      await expect(
        prisma.cliente.findUnique({ where: { id: cliente.id } }),
      ).resolves.toBeNull();
    });

    it('responde 409 RECURSO_EM_USO informando a quantidade de veiculos', async () => {
      const cliente = await prisma.cliente.create({ data: novoCliente(0) });
      await prisma.veiculo.createMany({
        data: [
          {
            placa: 'ABC1234',
            marca: 'Fiat',
            modelo: 'Argo',
            ano: 2021,
            clienteId: cliente.id,
          },
          {
            placa: 'RDF5G78',
            marca: 'Chevrolet',
            modelo: 'Onix',
            ano: 2019,
            clienteId: cliente.id,
          },
        ],
      });

      const resposta = await api.delete(`/clientes/${cliente.id}`).expect(409);

      expect(resposta.body).toEqual({
        status: 409,
        erro: 'RECURSO_EM_USO',
        mensagem:
          'O cliente possui 2 veículo(s) cadastrado(s) e não pode ser excluído.',
      });
    });

    it('responde 404 quando o cliente nao existe', async () => {
      await api.delete('/clientes/9999').expect(404);
    });
  });
});
