import { Test, type TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import {
  RecursoEmUsoException,
  RecursoNaoEncontradoException,
  RegistroDuplicadoException,
} from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CriarServicoDto } from './dto/criar-servico.dto.js';
import type { FiltrosServicoQueryDto } from './dto/filtros-servico-query.dto.js';
import { ServicosService } from './servicos.service.js';

/** PrismaService mockado: os testes unitarios nao tocam no banco. */
function criarPrismaMock() {
  return {
    servico: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    itemOrdemServico: {
      count: vi.fn(),
    },
  };
}

/** Filtros com os defaults que o ValidationPipe aplicaria. */
function filtros(
  extras: Partial<FiltrosServicoQueryDto> = {},
): FiltrosServicoQueryDto {
  return {
    page: 1,
    limit: 10,
    ordenar_por: 'descricao',
    ordem: 'asc',
    ...extras,
  };
}

const DADOS_VALIDOS: CriarServicoDto = {
  descricao: 'Troca de oleo e filtro',
  preco: 189.9,
  tempoEstimadoMin: 45,
  ativo: true,
};

const SERVICO_SALVO = {
  id: 1,
  descricao: 'Troca de oleo e filtro',
  preco: new Prisma.Decimal('189.90'),
  tempoEstimadoMin: 45,
  ativo: true,
  createdAt: new Date('2026-09-01T12:00:00.000Z'),
  updatedAt: new Date('2026-09-01T12:00:00.000Z'),
};

describe('ServicosService', () => {
  let service: ServicosService;
  let prisma: ReturnType<typeof criarPrismaMock>;

  beforeEach(async () => {
    prisma = criarPrismaMock();

    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        ServicosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = modulo.get(ServicosService);
  });

  describe('listar', () => {
    it('ordena por descricao asc com desempate por id por padrao', async () => {
      prisma.servico.findMany.mockResolvedValue([SERVICO_SALVO]);
      prisma.servico.count.mockResolvedValue(10);

      const resposta = await service.listar(filtros());

      expect(prisma.servico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          orderBy: [{ descricao: 'asc' }, { id: 'asc' }],
          skip: 0,
          take: 10,
        }),
      );
      expect(resposta).toMatchObject({ page: 1, limit: 10, total: 10 });
    });

    it.each([
      ['descricao', 'asc', 'descricao'],
      ['preco', 'desc', 'preco'],
      ['tempo_estimado', 'asc', 'tempoEstimadoMin'],
    ] as const)(
      'traduz ordenar_por=%s ordem=%s para o campo %s do Prisma',
      async (ordenar_por, ordem, campoEsperado) => {
        prisma.servico.findMany.mockResolvedValue([]);
        prisma.servico.count.mockResolvedValue(0);

        await service.listar(filtros({ ordenar_por, ordem }));

        expect(prisma.servico.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: [{ [campoEsperado]: ordem }, { id: 'asc' }],
          }),
        );
      },
    );

    it('monta a faixa de preco com limites inclusivos', async () => {
      prisma.servico.findMany.mockResolvedValue([]);
      prisma.servico.count.mockResolvedValue(0);

      await service.listar(filtros({ preco_min: 100, preco_max: 500 }));

      expect(prisma.servico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { preco: { gte: 100, lte: 500 } } }),
      );
    });

    it('aceita apenas um dos extremos da faixa', async () => {
      prisma.servico.findMany.mockResolvedValue([]);
      prisma.servico.count.mockResolvedValue(0);

      await service.listar(filtros({ preco_min: 100 }));
      expect(prisma.servico.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { preco: { gte: 100 } } }),
      );

      await service.listar(filtros({ preco_max: 500 }));
      expect(prisma.servico.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { preco: { lte: 500 } } }),
      );
    });

    it('combina descricao parcial insensivel e ativo', async () => {
      prisma.servico.findMany.mockResolvedValue([]);
      prisma.servico.count.mockResolvedValue(0);

      await service.listar(filtros({ descricao: 'troca', ativo: false }));

      expect(prisma.servico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            descricao: { contains: 'troca', mode: 'insensitive' },
            ativo: false,
          },
        }),
      );
    });
  });

  describe('buscarPorId', () => {
    it('devolve o servico encontrado', async () => {
      prisma.servico.findUnique.mockResolvedValue(SERVICO_SALVO);

      await expect(service.buscarPorId(1)).resolves.toEqual(SERVICO_SALVO);
    });

    it('lanca 404 quando o servico nao existe', async () => {
      prisma.servico.findUnique.mockResolvedValue(null);

      await expect(service.buscarPorId(99)).rejects.toMatchObject({
        erro: 'RECURSO_NAO_ENCONTRADO',
        mensagem: 'Serviço com id 99 não encontrado.',
      });
    });
  });

  describe('criar', () => {
    it('grava quando a descricao esta livre', async () => {
      prisma.servico.findFirst.mockResolvedValue(null);
      prisma.servico.create.mockResolvedValue(SERVICO_SALVO);

      await expect(service.criar(DADOS_VALIDOS)).resolves.toEqual(
        SERVICO_SALVO,
      );
      expect(prisma.servico.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: DADOS_VALIDOS }),
      );
    });

    it('compara a descricao sem diferenciar maiusculas', async () => {
      prisma.servico.findFirst.mockResolvedValue(null);
      prisma.servico.create.mockResolvedValue(SERVICO_SALVO);

      await service.criar(DADOS_VALIDOS);

      expect(prisma.servico.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            descricao: {
              equals: 'Troca de oleo e filtro',
              mode: 'insensitive',
            },
          },
        }),
      );
    });

    it('lanca 409 quando ja existe servico com a mesma descricao', async () => {
      prisma.servico.findFirst.mockResolvedValue({ id: 1 });

      await expect(service.criar(DADOS_VALIDOS)).rejects.toThrow(
        RegistroDuplicadoException,
      );
      await expect(service.criar(DADOS_VALIDOS)).rejects.toMatchObject({
        erro: 'REGISTRO_DUPLICADO',
        mensagem: 'Já existe um serviço com esta descrição.',
      });
      expect(prisma.servico.create).not.toHaveBeenCalled();
    });

    it('detecta duplicidade em descricao com caixa e espacos diferentes', async () => {
      // O DTO ja aplica trim; o mode insensitive cuida da caixa.
      prisma.servico.findFirst.mockResolvedValue({ id: 1 });

      await expect(
        service.criar({
          ...DADOS_VALIDOS,
          descricao: 'TROCA DE OLEO E FILTRO',
        }),
      ).rejects.toThrow(RegistroDuplicadoException);

      expect(prisma.servico.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            descricao: {
              equals: 'TROCA DE OLEO E FILTRO',
              mode: 'insensitive',
            },
          },
        }),
      );
    });
  });

  describe('atualizar', () => {
    it('ignora o proprio registro na verificacao de descricao', async () => {
      prisma.servico.findUnique.mockResolvedValue({ id: 1 });
      prisma.servico.findFirst.mockResolvedValue(null);
      prisma.servico.update.mockResolvedValue(SERVICO_SALVO);

      await service.atualizar(1, DADOS_VALIDOS);

      expect(prisma.servico.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            descricao: {
              equals: 'Troca de oleo e filtro',
              mode: 'insensitive',
            },
            id: { not: 1 },
          },
        }),
      );
    });

    it('lanca 409 quando a descricao pertence a outro servico', async () => {
      prisma.servico.findUnique.mockResolvedValue({ id: 1 });
      prisma.servico.findFirst.mockResolvedValue({ id: 2 });

      await expect(service.atualizar(1, DADOS_VALIDOS)).rejects.toMatchObject({
        mensagem: 'Já existe um serviço com esta descrição.',
      });
      expect(prisma.servico.update).not.toHaveBeenCalled();
    });

    it('lanca 404 quando o servico nao existe', async () => {
      prisma.servico.findUnique.mockResolvedValue(null);

      await expect(service.atualizar(99, DADOS_VALIDOS)).rejects.toThrow(
        RecursoNaoEncontradoException,
      );
      expect(prisma.servico.update).not.toHaveBeenCalled();
    });
  });

  describe('remover', () => {
    it('exclui quando o servico nunca foi lancado em uma ordem', async () => {
      prisma.servico.findUnique.mockResolvedValue({ id: 10 });
      prisma.itemOrdemServico.count.mockResolvedValue(0);

      await service.remover(10);

      expect(prisma.servico.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    });

    it('lanca 409 com a contagem de itens e a orientacao de desativar', async () => {
      prisma.servico.findUnique.mockResolvedValue({ id: 1 });
      prisma.itemOrdemServico.count.mockResolvedValue(9);

      await expect(service.remover(1)).rejects.toThrow(RecursoEmUsoException);
      await expect(service.remover(1)).rejects.toMatchObject({
        erro: 'RECURSO_EM_USO',
        mensagem:
          'O serviço está lançado em 9 item(ns) de ordem(ns) de serviço e não pode ser excluído. ' +
          'Para retirá-lo do catálogo, altere o campo ativo para false.',
      });
      expect(prisma.servico.delete).not.toHaveBeenCalled();
    });

    it('lanca 404 quando o servico nao existe', async () => {
      prisma.servico.findUnique.mockResolvedValue(null);

      await expect(service.remover(99)).rejects.toThrow(
        RecursoNaoEncontradoException,
      );
      expect(prisma.servico.delete).not.toHaveBeenCalled();
    });
  });
});
