import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  RecursoEmUsoException,
  RecursoNaoEncontradoException,
  RegistroDuplicadoException,
} from '../../common/errors/api.exception.js';
import {
  calcularPaginacao,
  montarRespostaPaginada,
  type RespostaPaginada,
} from '../../common/utils/paginacao.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AtualizarServicoDto } from './dto/atualizar-servico.dto.js';
import type { CriarServicoDto } from './dto/criar-servico.dto.js';
import type {
  CampoOrdenacaoServico,
  FiltrosServicoQueryDto,
} from './dto/filtros-servico-query.dto.js';

/**
 * Campos devolvidos pela API para um servico.
 * `preco` e Decimal no banco e sai como number pelo DecimalInterceptor global.
 */
const SELECT_SERVICO = {
  id: true,
  descricao: true,
  preco: true,
  tempoEstimadoMin: true,
  ativo: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ServicoSelect;

/**
 * Forma do servico como o Prisma devolve: `preco` e um `Prisma.Decimal`.
 * O `DecimalInterceptor` global o converte em `number` na saida HTTP, que e o
 * que `ServicoRespostaDto` documenta -- por isso o service trabalha com este
 * tipo e o DTO fica reservado ao Swagger.
 */
export type ServicoDoPrisma = Prisma.ServicoGetPayload<{
  select: typeof SELECT_SERVICO;
}>;

/** Traduz o valor de `ordenar_por` para o campo correspondente no Prisma. */
const CAMPO_DO_PRISMA: Record<
  CampoOrdenacaoServico,
  keyof Prisma.ServicoOrderByWithRelationInput
> = {
  descricao: 'descricao',
  preco: 'preco',
  tempo_estimado: 'tempoEstimadoMin',
};

@Injectable()
export class ServicosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(
    filtros: FiltrosServicoQueryDto,
  ): Promise<RespostaPaginada<ServicoDoPrisma>> {
    const { skip, take } = calcularPaginacao(filtros);
    const where = this.montarFiltros(filtros);

    const [data, total] = await Promise.all([
      this.prisma.servico.findMany({
        where,
        select: SELECT_SERVICO,
        orderBy: this.montarOrdenacao(filtros),
        skip,
        take,
      }),
      this.prisma.servico.count({ where }),
    ]);

    return montarRespostaPaginada(data, total, filtros);
  }

  async buscarPorId(id: number): Promise<ServicoDoPrisma> {
    const servico = await this.prisma.servico.findUnique({
      where: { id },
      select: SELECT_SERVICO,
    });

    if (!servico) {
      throw new RecursoNaoEncontradoException('Serviço', id);
    }

    return servico;
  }

  async criar(dto: CriarServicoDto): Promise<ServicoDoPrisma> {
    await this.garantirDescricaoDisponivel(dto.descricao);

    return this.prisma.servico.create({
      data: dto,
      select: SELECT_SERVICO,
    });
  }

  async atualizar(
    id: number,
    dto: AtualizarServicoDto,
  ): Promise<ServicoDoPrisma> {
    await this.garantirQueExiste(id);
    await this.garantirDescricaoDisponivel(dto.descricao, id);

    return this.prisma.servico.update({
      where: { id },
      data: dto,
      select: SELECT_SERVICO,
    });
  }

  async remover(id: number): Promise<void> {
    await this.garantirQueExiste(id);

    const itens = await this.prisma.itemOrdemServico.count({
      where: { servicoId: id },
    });

    if (itens > 0) {
      throw new RecursoEmUsoException(
        `O serviço está lançado em ${itens} item(ns) de ordem(ns) de serviço e não pode ser excluído. ` +
          'Para retirá-lo do catálogo, altere o campo ativo para false.',
      );
    }

    await this.prisma.servico.delete({ where: { id } });
  }

  /** Monta o filtro do Prisma a partir dos query params recebidos. */
  private montarFiltros(
    filtros: FiltrosServicoQueryDto,
  ): Prisma.ServicoWhereInput {
    const where: Prisma.ServicoWhereInput = {};

    if (filtros.descricao) {
      where.descricao = { contains: filtros.descricao, mode: 'insensitive' };
    }

    // Faixa de preco com limites inclusivos.
    if (filtros.preco_min !== undefined || filtros.preco_max !== undefined) {
      where.preco = {
        ...(filtros.preco_min !== undefined ? { gte: filtros.preco_min } : {}),
        ...(filtros.preco_max !== undefined ? { lte: filtros.preco_max } : {}),
      };
    }

    if (filtros.ativo !== undefined) {
      where.ativo = filtros.ativo;
    }

    return where;
  }

  /**
   * Ordena pelo campo pedido e desempata por id, para a paginacao ficar
   * estavel quando varios servicos tem o mesmo preco ou tempo.
   */
  private montarOrdenacao(
    filtros: FiltrosServicoQueryDto,
  ): Prisma.ServicoOrderByWithRelationInput[] {
    const campo = CAMPO_DO_PRISMA[filtros.ordenar_por];

    return [{ [campo]: filtros.ordem }, { id: 'asc' }];
  }

  /** Garante que o servico existe antes de atualizar ou excluir. */
  private async garantirQueExiste(id: number): Promise<void> {
    const servico = await this.prisma.servico.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!servico) {
      throw new RecursoNaoEncontradoException('Serviço', id);
    }
  }

  /**
   * O catalogo nao deve ter duas entradas com a mesma descricao. A comparacao
   * ignora maiusculas/minusculas (`mode: 'insensitive'`) e os espacos das
   * pontas ja foram removidos pelo transformer do DTO -- por isso a regra vive
   * aqui, e nao numa constraint do banco.
   */
  private async garantirDescricaoDisponivel(
    descricao: string,
    idIgnorado?: number,
  ): Promise<void> {
    const emUso = await this.prisma.servico.findFirst({
      where: {
        descricao: { equals: descricao, mode: 'insensitive' },
        ...(idIgnorado ? { id: { not: idIgnorado } } : {}),
      },
      select: { id: true },
    });

    if (emUso) {
      throw new RegistroDuplicadoException(
        'Já existe um serviço com esta descrição.',
      );
    }
  }
}
