import { Test, type TestingModule } from '@nestjs/testing';
import {
  RecursoEmUsoException,
  RecursoNaoEncontradoException,
  RegistroDuplicadoException,
} from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ClientesService } from './clientes.service.js';
import type { CriarClienteDto } from './dto/criar-cliente.dto.js';

/** PrismaService mockado: os testes unitarios nao tocam no banco. */
function criarPrismaMock() {
  return {
    cliente: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    veiculo: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  };
}

/** Le o `where` de uma chamada registrada no mock, com tipo conhecido. */
function whereDaChamada(
  mock: { mock: { calls: unknown[][] } },
  indice = 0,
): Record<string, unknown> {
  const [argumentos] = mock.mock.calls[indice] as [
    { where?: Record<string, unknown> },
  ];

  return argumentos.where ?? {};
}

const DADOS_VALIDOS: CriarClienteDto = {
  nome: 'Ana Paula Ribeiro',
  cpf: '52998224725',
  email: 'ana.1@email.com',
  telefone: '47991012233',
};

const CLIENTE_SALVO = {
  id: 1,
  ...DADOS_VALIDOS,
  createdAt: new Date('2026-09-01T12:00:00.000Z'),
  updatedAt: new Date('2026-09-01T12:00:00.000Z'),
};

describe('ClientesService', () => {
  let service: ClientesService;
  let prisma: ReturnType<typeof criarPrismaMock>;

  beforeEach(async () => {
    prisma = criarPrismaMock();

    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        ClientesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = modulo.get(ClientesService);
  });

  describe('listar', () => {
    it('pagina, ordena por nome e devolve o envelope padrao', async () => {
      prisma.cliente.findMany.mockResolvedValue([CLIENTE_SALVO]);
      prisma.cliente.count.mockResolvedValue(25);

      const resposta = await service.listar({ page: 2, limit: 10 });

      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          orderBy: { nome: 'asc' },
          skip: 10,
          take: 10,
        }),
      );
      expect(resposta).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        data: [CLIENTE_SALVO],
      });
    });

    it('monta busca parcial insensivel para nome e email e exata para cpf', async () => {
      prisma.cliente.findMany.mockResolvedValue([]);
      prisma.cliente.count.mockResolvedValue(0);

      await service.listar({
        page: 1,
        limit: 10,
        nome: 'ana',
        email: 'email.com',
        cpf: '52998224725',
      });

      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            nome: { contains: 'ana', mode: 'insensitive' },
            cpf: '52998224725',
            email: { contains: 'email.com', mode: 'insensitive' },
          },
        }),
      );
    });

    it('usa o mesmo filtro na contagem e na busca', async () => {
      prisma.cliente.findMany.mockResolvedValue([]);
      prisma.cliente.count.mockResolvedValue(0);

      await service.listar({ page: 1, limit: 10, nome: 'ana' });

      expect(whereDaChamada(prisma.cliente.count)).toEqual(
        whereDaChamada(prisma.cliente.findMany),
      );
    });
  });

  describe('buscarPorId', () => {
    it('devolve o cliente com os veiculos resumidos', async () => {
      const comVeiculos = { ...CLIENTE_SALVO, veiculos: [] };
      prisma.cliente.findUnique.mockResolvedValue(comVeiculos);

      await expect(service.buscarPorId(1)).resolves.toEqual(comVeiculos);
    });

    it('lanca 404 quando o cliente nao existe', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);

      await expect(service.buscarPorId(99)).rejects.toThrow(
        RecursoNaoEncontradoException,
      );
      await expect(service.buscarPorId(99)).rejects.toMatchObject({
        mensagem: 'Cliente com id 99 não encontrado.',
      });
    });
  });

  describe('listarVeiculos', () => {
    it('devolve os veiculos do cliente ordenados por placa', async () => {
      prisma.cliente.findUnique.mockResolvedValue({ id: 3 });
      prisma.veiculo.findMany.mockResolvedValue([{ id: 1, placa: 'ABC1234' }]);

      const veiculos = await service.listarVeiculos(3);

      expect(prisma.veiculo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clienteId: 3 },
          orderBy: { placa: 'asc' },
        }),
      );
      expect(veiculos).toHaveLength(1);
    });

    it('lanca 404 antes de consultar veiculos quando o cliente nao existe', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);

      await expect(service.listarVeiculos(99)).rejects.toThrow(
        RecursoNaoEncontradoException,
      );
      expect(prisma.veiculo.findMany).not.toHaveBeenCalled();
    });
  });

  describe('criar', () => {
    it('grava quando CPF e e-mail estao livres', async () => {
      prisma.cliente.findFirst.mockResolvedValue(null);
      prisma.cliente.create.mockResolvedValue(CLIENTE_SALVO);

      await expect(service.criar(DADOS_VALIDOS)).resolves.toEqual(
        CLIENTE_SALVO,
      );
      expect(prisma.cliente.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: DADOS_VALIDOS }),
      );
    });

    it('lanca 409 com mensagem de CPF quando o CPF ja existe', async () => {
      prisma.cliente.findFirst.mockImplementation(
        ({ where }: { where: { cpf?: string } }) =>
          where.cpf ? { id: 7 } : null,
      );

      await expect(service.criar(DADOS_VALIDOS)).rejects.toThrow(
        RegistroDuplicadoException,
      );
      await expect(service.criar(DADOS_VALIDOS)).rejects.toMatchObject({
        erro: 'REGISTRO_DUPLICADO',
        mensagem: 'Já existe um cliente com este CPF.',
      });
      expect(prisma.cliente.create).not.toHaveBeenCalled();
    });

    it('lanca 409 com mensagem de e-mail quando so o e-mail ja existe', async () => {
      prisma.cliente.findFirst.mockImplementation(
        ({ where }: { where: { email?: string } }) =>
          where.email ? { id: 9 } : null,
      );

      await expect(service.criar(DADOS_VALIDOS)).rejects.toMatchObject({
        mensagem: 'Já existe um cliente com este e-mail.',
      });
    });
  });

  describe('atualizar', () => {
    it('ignora o proprio registro na verificacao de duplicidade', async () => {
      prisma.cliente.findUnique.mockResolvedValue({ id: 1 });
      prisma.cliente.findFirst.mockResolvedValue(null);
      prisma.cliente.update.mockResolvedValue(CLIENTE_SALVO);

      await service.atualizar(1, DADOS_VALIDOS);

      for (
        let indice = 0;
        indice < prisma.cliente.findFirst.mock.calls.length;
        indice += 1
      ) {
        expect(whereDaChamada(prisma.cliente.findFirst, indice)).toMatchObject({
          id: { not: 1 },
        });
      }
      expect(prisma.cliente.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 }, data: DADOS_VALIDOS }),
      );
    });

    it('lanca 409 quando o CPF pertence a outro cliente', async () => {
      prisma.cliente.findUnique.mockResolvedValue({ id: 1 });
      prisma.cliente.findFirst.mockImplementation(
        ({ where }: { where: { cpf?: string } }) =>
          where.cpf ? { id: 2 } : null,
      );

      await expect(service.atualizar(1, DADOS_VALIDOS)).rejects.toMatchObject({
        mensagem: 'Já existe um cliente com este CPF.',
      });
      expect(prisma.cliente.update).not.toHaveBeenCalled();
    });

    it('lanca 404 quando o cliente nao existe', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);

      await expect(service.atualizar(99, DADOS_VALIDOS)).rejects.toThrow(
        RecursoNaoEncontradoException,
      );
      expect(prisma.cliente.update).not.toHaveBeenCalled();
    });
  });

  describe('remover', () => {
    it('exclui quando o cliente nao tem veiculos', async () => {
      prisma.cliente.findUnique.mockResolvedValue({ id: 1 });
      prisma.veiculo.count.mockResolvedValue(0);

      await service.remover(1);

      expect(prisma.cliente.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('lanca 409 informando a quantidade de veiculos', async () => {
      prisma.cliente.findUnique.mockResolvedValue({ id: 3 });
      prisma.veiculo.count.mockResolvedValue(2);

      await expect(service.remover(3)).rejects.toThrow(RecursoEmUsoException);
      await expect(service.remover(3)).rejects.toMatchObject({
        erro: 'RECURSO_EM_USO',
        mensagem:
          'O cliente possui 2 veículo(s) cadastrado(s) e não pode ser excluído.',
      });
      expect(prisma.cliente.delete).not.toHaveBeenCalled();
    });

    it('lanca 404 quando o cliente nao existe', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);

      await expect(service.remover(99)).rejects.toThrow(
        RecursoNaoEncontradoException,
      );
      expect(prisma.cliente.delete).not.toHaveBeenCalled();
    });
  });
});
