import { Test, type TestingModule } from '@nestjs/testing';
import {
  RecursoEmUsoException,
  RecursoNaoEncontradoException,
} from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CriarMecanicoDto } from './dto/criar-mecanico.dto.js';
import { MecanicosService } from './mecanicos.service.js';

/** PrismaService mockado: os testes unitarios nao tocam no banco. */
function criarPrismaMock() {
  return {
    mecanico: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ordemServico: {
      count: vi.fn(),
    },
  };
}

const DADOS_VALIDOS: CriarMecanicoDto = {
  nome: 'Adilson Moita',
  especialidade: 'Motor e injecao eletronica',
  telefone: '4733441001',
  ativo: true,
};

const MECANICO_SALVO = {
  id: 1,
  ...DADOS_VALIDOS,
  createdAt: new Date('2026-09-01T12:00:00.000Z'),
  updatedAt: new Date('2026-09-01T12:00:00.000Z'),
};

describe('MecanicosService', () => {
  let service: MecanicosService;
  let prisma: ReturnType<typeof criarPrismaMock>;

  beforeEach(async () => {
    prisma = criarPrismaMock();

    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        MecanicosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = modulo.get(MecanicosService);
  });

  describe('listar', () => {
    it('pagina, ordena por nome com desempate por id e devolve o envelope', async () => {
      prisma.mecanico.findMany.mockResolvedValue([MECANICO_SALVO]);
      prisma.mecanico.count.mockResolvedValue(5);

      const resposta = await service.listar({ page: 1, limit: 10 });

      expect(prisma.mecanico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          orderBy: [{ nome: 'asc' }, { id: 'asc' }],
          skip: 0,
          take: 10,
        }),
      );
      expect(resposta).toEqual({
        page: 1,
        limit: 10,
        total: 5,
        data: [MECANICO_SALVO],
      });
    });

    it('monta busca parcial insensivel para nome e especialidade', async () => {
      prisma.mecanico.findMany.mockResolvedValue([]);
      prisma.mecanico.count.mockResolvedValue(0);

      await service.listar({
        page: 1,
        limit: 10,
        nome: 'adilson',
        especialidade: 'freios',
      });

      expect(prisma.mecanico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            nome: { contains: 'adilson', mode: 'insensitive' },
            especialidade: { contains: 'freios', mode: 'insensitive' },
          },
        }),
      );
    });

    it.each([true, false])('filtra por ativo = %s', async (ativo) => {
      prisma.mecanico.findMany.mockResolvedValue([]);
      prisma.mecanico.count.mockResolvedValue(0);

      await service.listar({ page: 1, limit: 10, ativo });

      expect(prisma.mecanico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ativo } }),
      );
    });

    it('nao filtra por ativo quando o parametro nao vem', async () => {
      prisma.mecanico.findMany.mockResolvedValue([]);
      prisma.mecanico.count.mockResolvedValue(0);

      await service.listar({ page: 1, limit: 10 });

      expect(prisma.mecanico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('buscarPorId', () => {
    it('devolve o mecanico com o total de ordens de servico', async () => {
      prisma.mecanico.findUnique.mockResolvedValue({
        ...MECANICO_SALVO,
        _count: { ordensServico: 6 },
      });

      const mecanico = await service.buscarPorId(1);

      expect(mecanico).toEqual({ ...MECANICO_SALVO, totalOrdensServico: 6 });
      expect(mecanico).not.toHaveProperty('_count');
    });

    it('lanca 404 quando o mecanico nao existe', async () => {
      prisma.mecanico.findUnique.mockResolvedValue(null);

      await expect(service.buscarPorId(99)).rejects.toThrow(
        RecursoNaoEncontradoException,
      );
      await expect(service.buscarPorId(99)).rejects.toMatchObject({
        mensagem: 'Mecânico com id 99 não encontrado.',
      });
    });
  });

  describe('criar', () => {
    it('grava os dados recebidos', async () => {
      prisma.mecanico.create.mockResolvedValue(MECANICO_SALVO);

      await expect(service.criar(DADOS_VALIDOS)).resolves.toEqual(
        MECANICO_SALVO,
      );
      expect(prisma.mecanico.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: DADOS_VALIDOS }),
      );
    });
  });

  describe('atualizar', () => {
    it('atualiza quando o mecanico existe', async () => {
      prisma.mecanico.findUnique.mockResolvedValue({ id: 1 });
      prisma.mecanico.update.mockResolvedValue({
        ...MECANICO_SALVO,
        ativo: false,
      });

      const atualizado = await service.atualizar(1, {
        ...DADOS_VALIDOS,
        ativo: false,
      });

      expect(atualizado.ativo).toBe(false);
    });

    it('lanca 404 quando o mecanico nao existe', async () => {
      prisma.mecanico.findUnique.mockResolvedValue(null);

      await expect(service.atualizar(99, DADOS_VALIDOS)).rejects.toThrow(
        RecursoNaoEncontradoException,
      );
      expect(prisma.mecanico.update).not.toHaveBeenCalled();
    });
  });

  describe('remover', () => {
    it('exclui quando o mecanico nao tem ordens de servico', async () => {
      prisma.mecanico.findUnique.mockResolvedValue({ id: 5 });
      prisma.ordemServico.count.mockResolvedValue(0);

      await service.remover(5);

      expect(prisma.mecanico.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it('lanca 409 com a contagem e a orientacao de desativar', async () => {
      prisma.mecanico.findUnique.mockResolvedValue({ id: 1 });
      prisma.ordemServico.count.mockResolvedValue(6);

      await expect(service.remover(1)).rejects.toThrow(RecursoEmUsoException);
      await expect(service.remover(1)).rejects.toMatchObject({
        erro: 'RECURSO_EM_USO',
        mensagem:
          'O mecânico possui 6 ordem(ns) de serviço vinculada(s) e não pode ser excluído. ' +
          'Para removê-lo das novas ordens, altere o campo ativo para false.',
      });
      expect(prisma.mecanico.delete).not.toHaveBeenCalled();
    });

    it('lanca 404 quando o mecanico nao existe', async () => {
      prisma.mecanico.findUnique.mockResolvedValue(null);

      await expect(service.remover(99)).rejects.toThrow(
        RecursoNaoEncontradoException,
      );
      expect(prisma.mecanico.delete).not.toHaveBeenCalled();
    });
  });
});
