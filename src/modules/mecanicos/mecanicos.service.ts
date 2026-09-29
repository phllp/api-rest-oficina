import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  RecursoEmUsoException,
  RecursoNaoEncontradoException,
} from '../../common/errors/api.exception.js';
import {
  calcularPaginacao,
  montarRespostaPaginada,
  type RespostaPaginada,
} from '../../common/utils/paginacao.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AtualizarMecanicoDto } from './dto/atualizar-mecanico.dto.js';
import type { CriarMecanicoDto } from './dto/criar-mecanico.dto.js';
import type { FiltrosMecanicoQueryDto } from './dto/filtros-mecanico-query.dto.js';
import type {
  MecanicoDetalheRespostaDto,
  MecanicoRespostaDto,
} from './dto/mecanico-resposta.dto.js';

/** Campos devolvidos pela API para um mecanico. */
const SELECT_MECANICO = {
  id: true,
  nome: true,
  especialidade: true,
  telefone: true,
  ativo: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MecanicoSelect;

@Injectable()
export class MecanicosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(
    filtros: FiltrosMecanicoQueryDto,
  ): Promise<RespostaPaginada<MecanicoRespostaDto>> {
    const { skip, take } = calcularPaginacao(filtros);
    const where = this.montarFiltros(filtros);

    const [data, total] = await Promise.all([
      this.prisma.mecanico.findMany({
        where,
        select: SELECT_MECANICO,
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
      this.prisma.mecanico.count({ where }),
    ]);

    return montarRespostaPaginada(data, total, filtros);
  }

  async buscarPorId(id: number): Promise<MecanicoDetalheRespostaDto> {
    const mecanico = await this.prisma.mecanico.findUnique({
      where: { id },
      select: {
        ...SELECT_MECANICO,
        _count: { select: { ordensServico: true } },
      },
    });

    if (!mecanico) {
      throw new RecursoNaoEncontradoException('Mecânico', id);
    }

    const { _count, ...dados } = mecanico;

    return { ...dados, totalOrdensServico: _count.ordensServico };
  }

  async criar(dto: CriarMecanicoDto): Promise<MecanicoRespostaDto> {
    return this.prisma.mecanico.create({
      data: dto,
      select: SELECT_MECANICO,
    });
  }

  async atualizar(
    id: number,
    dto: AtualizarMecanicoDto,
  ): Promise<MecanicoRespostaDto> {
    await this.garantirQueExiste(id);

    return this.prisma.mecanico.update({
      where: { id },
      data: dto,
      select: SELECT_MECANICO,
    });
  }

  async remover(id: number): Promise<void> {
    await this.garantirQueExiste(id);

    const ordens = await this.prisma.ordemServico.count({
      where: { mecanicoId: id },
    });

    if (ordens > 0) {
      throw new RecursoEmUsoException(
        `O mecânico possui ${ordens} ordem(ns) de serviço vinculada(s) e não pode ser excluído. ` +
          'Para removê-lo das novas ordens, altere o campo ativo para false.',
      );
    }

    await this.prisma.mecanico.delete({ where: { id } });
  }

  /** Monta o filtro do Prisma a partir dos query params recebidos. */
  private montarFiltros(
    filtros: FiltrosMecanicoQueryDto,
  ): Prisma.MecanicoWhereInput {
    const where: Prisma.MecanicoWhereInput = {};

    if (filtros.nome) {
      where.nome = { contains: filtros.nome, mode: 'insensitive' };
    }

    if (filtros.especialidade) {
      where.especialidade = {
        contains: filtros.especialidade,
        mode: 'insensitive',
      };
    }

    if (filtros.ativo !== undefined) {
      where.ativo = filtros.ativo;
    }

    return where;
  }

  /** Garante que o mecanico existe antes de atualizar ou excluir. */
  private async garantirQueExiste(id: number): Promise<void> {
    const mecanico = await this.prisma.mecanico.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!mecanico) {
      throw new RecursoNaoEncontradoException('Mecânico', id);
    }
  }
}
