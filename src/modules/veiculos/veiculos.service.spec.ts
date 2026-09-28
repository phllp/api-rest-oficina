import { Test, type TestingModule } from '@nestjs/testing';
import {
  RecursoEmUsoException,
  RecursoNaoEncontradoException,
  RegistroDuplicadoException,
} from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CriarVeiculoDto } from './dto/criar-veiculo.dto.js';
import { VeiculosService } from './veiculos.service.js';

/** PrismaService mockado: os testes unitarios nao tocam no banco. */
function criarPrismaMock() {
  return {
    veiculo: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    cliente: {
      findUnique: vi.fn(),
    },
    ordemServico: {
      count: vi.fn(),
    },
  };
}

const DADOS_VALIDOS: CriarVeiculoDto = {
  placa: 'ABC1D23',
  marca: 'Fiat',
  modelo: 'Argo Drive 1.0',
  ano: 2021,
  cor: 'Branco',
  clienteId: 3,
};

const VEICULO_SALVO = {
  id: 1,
  ...DADOS_VALIDOS,
  createdAt: new Date('2026-09-01T12:00:00.000Z'),
  updatedAt: new Date('2026-09-01T12:00:00.000Z'),
};

describe('VeiculosService', () => {
  let service: VeiculosService;
  let prisma: ReturnType<typeof criarPrismaMock>;

  beforeEach(async () => {
    prisma = criarPrismaMock();

    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        VeiculosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = modulo.get(VeiculosService);
  });

  describe('listar', () => {
    it('pagina, ordena por placa e devolve o envelope padrao', async () => {
      prisma.veiculo.findMany.mockResolvedValue([VEICULO_SALVO]);
      prisma.veiculo.count.mockResolvedValue(35);

      const resposta = await service.listar({ page: 2, limit: 10 });

      expect(prisma.veiculo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          orderBy: { placa: 'asc' },
          skip: 10,
          take: 10,
        }),
      );
      expect(resposta).toEqual({
        page: 2,
        limit: 10,
        total: 35,
        data: [VEICULO_SALVO],
      });
    });

    it('monta cada filtro no formato esperado pelo Prisma', async () => {
      prisma.veiculo.findMany.mockResolvedValue([]);
      prisma.veiculo.count.mockResolvedValue(0);

      await service.listar({
        page: 1,
        limit: 10,
        placa: 'ABC',
        marca: 'fiat',
        modelo: 'argo',
        ano: 2021,
        cliente_id: 3,
      });

      expect(prisma.veiculo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            placa: { contains: 'ABC' },
            marca: { contains: 'fiat', mode: 'insensitive' },
            modelo: { contains: 'argo', mode: 'insensitive' },
            ano: 2021,
            clienteId: 3,
          },
        }),
      );
    });
  });

  describe('buscarPorId', () => {
    it('devolve o veiculo com o cliente resumido', async () => {
      const comCliente = {
        ...VEICULO_SALVO,
        cliente: {
          id: 3,
          nome: 'Carla Menezes Duarte',
          telefone: '47993034455',
        },
      };
      prisma.veiculo.findUnique.mockResolvedValue(comCliente);

      await expect(service.buscarPorId(1)).resolves.toEqual(comCliente);
    });

    it('lanca 404 quando o veiculo nao existe', async () => {
      prisma.veiculo.findUnique.mockResolvedValue(null);

      await expect(service.buscarPorId(99)).rejects.toMatchObject({
        erro: 'RECURSO_NAO_ENCONTRADO',
        mensagem: 'Veículo com id 99 não encontrado.',
      });
    });
  });

  describe('criar', () => {
    it('grava quando o cliente existe e a placa esta livre', async () => {
      prisma.cliente.findUnique.mockResolvedValue({ id: 3 });
      prisma.veiculo.findFirst.mockResolvedValue(null);
      prisma.veiculo.create.mockResolvedValue(VEICULO_SALVO);

      await expect(service.criar(DADOS_VALIDOS)).resolves.toEqual(
        VEICULO_SALVO,
      );
      expect(prisma.veiculo.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: DADOS_VALIDOS }),
      );
    });

    it('lanca 404 apontando o cliente quando o clienteId nao existe', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);

      await expect(service.criar(DADOS_VALIDOS)).rejects.toThrow(
        RecursoNaoEncontradoException,
      );
      await expect(service.criar(DADOS_VALIDOS)).rejects.toMatchObject({
        status: 404,
        mensagem: 'Cliente com id 3 não encontrado.',
      });
      expect(prisma.veiculo.create).not.toHaveBeenCalled();
    });

    it('lanca 409 com a placa na mensagem quando ela ja existe', async () => {
      prisma.cliente.findUnique.mockResolvedValue({ id: 3 });
      prisma.veiculo.findFirst.mockResolvedValue({ id: 8 });

      await expect(service.criar(DADOS_VALIDOS)).rejects.toThrow(
        RegistroDuplicadoException,
      );
      await expect(service.criar(DADOS_VALIDOS)).rejects.toMatchObject({
        erro: 'REGISTRO_DUPLICADO',
        mensagem: 'Já existe um veículo com a placa ABC1D23.',
      });
      expect(prisma.veiculo.create).not.toHaveBeenCalled();
    });
  });

  describe('atualizar', () => {
    it('permite transferir o veiculo para outro cliente', async () => {
      prisma.veiculo.findUnique.mockResolvedValue({ id: 1 });
      prisma.cliente.findUnique.mockResolvedValue({ id: 7 });
      prisma.veiculo.findFirst.mockResolvedValue(null);
      prisma.veiculo.update.mockResolvedValue({
        ...VEICULO_SALVO,
        clienteId: 7,
      });

      const atualizado = await service.atualizar(1, {
        ...DADOS_VALIDOS,
        clienteId: 7,
      });

      expect(prisma.cliente.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 7 } }),
      );
      expect(atualizado.clienteId).toBe(7);
    });

    it('ignora o proprio registro na verificacao de placa', async () => {
      prisma.veiculo.findUnique.mockResolvedValue({ id: 1 });
      prisma.cliente.findUnique.mockResolvedValue({ id: 3 });
      prisma.veiculo.findFirst.mockResolvedValue(null);
      prisma.veiculo.update.mockResolvedValue(VEICULO_SALVO);

      await service.atualizar(1, DADOS_VALIDOS);

      expect(prisma.veiculo.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { placa: 'ABC1D23', id: { not: 1 } },
        }),
      );
    });

    it('lanca 409 quando a placa pertence a outro veiculo', async () => {
      prisma.veiculo.findUnique.mockResolvedValue({ id: 1 });
      prisma.cliente.findUnique.mockResolvedValue({ id: 3 });
      prisma.veiculo.findFirst.mockResolvedValue({ id: 2 });

      await expect(service.atualizar(1, DADOS_VALIDOS)).rejects.toMatchObject({
        mensagem: 'Já existe um veículo com a placa ABC1D23.',
      });
      expect(prisma.veiculo.update).not.toHaveBeenCalled();
    });

    it('lanca 404 quando o veiculo nao existe', async () => {
      prisma.veiculo.findUnique.mockResolvedValue(null);

      await expect(service.atualizar(99, DADOS_VALIDOS)).rejects.toMatchObject({
        mensagem: 'Veículo com id 99 não encontrado.',
      });
      expect(prisma.veiculo.update).not.toHaveBeenCalled();
    });

    it('lanca 404 quando o novo clienteId nao existe', async () => {
      prisma.veiculo.findUnique.mockResolvedValue({ id: 1 });
      prisma.cliente.findUnique.mockResolvedValue(null);

      await expect(
        service.atualizar(1, { ...DADOS_VALIDOS, clienteId: 999 }),
      ).rejects.toMatchObject({
        status: 404,
        mensagem: 'Cliente com id 999 não encontrado.',
      });
      expect(prisma.veiculo.update).not.toHaveBeenCalled();
    });
  });

  describe('remover', () => {
    it('exclui quando o veiculo nao tem ordens de servico', async () => {
      prisma.veiculo.findUnique.mockResolvedValue({ id: 1 });
      prisma.ordemServico.count.mockResolvedValue(0);

      await service.remover(1);

      expect(prisma.veiculo.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('lanca 409 informando a quantidade de ordens de servico', async () => {
      prisma.veiculo.findUnique.mockResolvedValue({ id: 1 });
      prisma.ordemServico.count.mockResolvedValue(3);

      await expect(service.remover(1)).rejects.toThrow(RecursoEmUsoException);
      await expect(service.remover(1)).rejects.toMatchObject({
        erro: 'RECURSO_EM_USO',
        mensagem:
          'O veículo possui 3 ordem(ns) de serviço e não pode ser excluído.',
      });
      expect(prisma.veiculo.delete).not.toHaveBeenCalled();
    });

    it('lanca 404 quando o veiculo nao existe', async () => {
      prisma.veiculo.findUnique.mockResolvedValue(null);

      await expect(service.remover(99)).rejects.toThrow(
        RecursoNaoEncontradoException,
      );
      expect(prisma.veiculo.delete).not.toHaveBeenCalled();
    });
  });
});
