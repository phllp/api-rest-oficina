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
import type { AtualizarVeiculoDto } from './dto/atualizar-veiculo.dto.js';
import type { CriarVeiculoDto } from './dto/criar-veiculo.dto.js';
import type { FiltrosVeiculoQueryDto } from './dto/filtros-veiculo-query.dto.js';
import type {
  VeiculoDetalheRespostaDto,
  VeiculoRespostaDto,
} from './dto/veiculo-resposta.dto.js';

/** Campos devolvidos pela API para um veiculo. */
const SELECT_VEICULO = {
  id: true,
  placa: true,
  marca: true,
  modelo: true,
  ano: true,
  cor: true,
  clienteId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.VeiculoSelect;

/** Cliente resumido dentro do detalhe do veiculo. */
const SELECT_CLIENTE_RESUMO = {
  id: true,
  nome: true,
  telefone: true,
} satisfies Prisma.ClienteSelect;

@Injectable()
export class VeiculosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(
    filtros: FiltrosVeiculoQueryDto,
  ): Promise<RespostaPaginada<VeiculoRespostaDto>> {
    const { skip, take } = calcularPaginacao(filtros);
    const where = this.montarFiltros(filtros);

    const [data, total] = await Promise.all([
      this.prisma.veiculo.findMany({
        where,
        select: SELECT_VEICULO,
        orderBy: { placa: 'asc' },
        skip,
        take,
      }),
      this.prisma.veiculo.count({ where }),
    ]);

    return montarRespostaPaginada(data, total, filtros);
  }

  async buscarPorId(id: number): Promise<VeiculoDetalheRespostaDto> {
    const veiculo = await this.prisma.veiculo.findUnique({
      where: { id },
      select: { ...SELECT_VEICULO, cliente: { select: SELECT_CLIENTE_RESUMO } },
    });

    if (!veiculo) {
      throw new RecursoNaoEncontradoException('Veículo', id);
    }

    return veiculo;
  }

  async criar(dto: CriarVeiculoDto): Promise<VeiculoRespostaDto> {
    await this.garantirQueClienteExiste(dto.clienteId);
    await this.garantirPlacaDisponivel(dto.placa);

    return this.prisma.veiculo.create({
      data: dto,
      select: SELECT_VEICULO,
    });
  }

  async atualizar(
    id: number,
    dto: AtualizarVeiculoDto,
  ): Promise<VeiculoRespostaDto> {
    await this.garantirQueExiste(id);
    await this.garantirQueClienteExiste(dto.clienteId);
    await this.garantirPlacaDisponivel(dto.placa, id);

    return this.prisma.veiculo.update({
      where: { id },
      data: dto,
      select: SELECT_VEICULO,
    });
  }

  async remover(id: number): Promise<void> {
    await this.garantirQueExiste(id);

    const ordens = await this.prisma.ordemServico.count({
      where: { veiculoId: id },
    });

    if (ordens > 0) {
      throw new RecursoEmUsoException(
        `O veículo possui ${ordens} ordem(ns) de serviço e não pode ser excluído.`,
      );
    }

    await this.prisma.veiculo.delete({ where: { id } });
  }

  /** Monta o filtro do Prisma a partir dos query params recebidos. */
  private montarFiltros(
    filtros: FiltrosVeiculoQueryDto,
  ): Prisma.VeiculoWhereInput {
    const where: Prisma.VeiculoWhereInput = {};

    if (filtros.placa) {
      where.placa = { contains: filtros.placa };
    }

    if (filtros.marca) {
      where.marca = { contains: filtros.marca, mode: 'insensitive' };
    }

    if (filtros.modelo) {
      where.modelo = { contains: filtros.modelo, mode: 'insensitive' };
    }

    if (filtros.ano !== undefined) {
      where.ano = filtros.ano;
    }

    if (filtros.cliente_id !== undefined) {
      where.clienteId = filtros.cliente_id;
    }

    return where;
  }

  /** Garante que o veiculo existe antes de atualizar ou excluir. */
  private async garantirQueExiste(id: number): Promise<void> {
    const veiculo = await this.prisma.veiculo.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!veiculo) {
      throw new RecursoNaoEncontradoException('Veículo', id);
    }
  }

  /**
   * Confere o proprietario informado: um clienteId inexistente e erro do
   * cliente da API (404 apontando o recurso que falta), nao uma violacao de FK.
   */
  private async garantirQueClienteExiste(clienteId: number): Promise<void> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true },
    });

    if (!cliente) {
      throw new RecursoNaoEncontradoException('Cliente', clienteId);
    }
  }

  /**
   * Checa a placa antes de gravar, para responder 409 com a placa na mensagem.
   * Em atualizacoes, o proprio veiculo e ignorado na verificacao.
   */
  private async garantirPlacaDisponivel(
    placa: string,
    idIgnorado?: number,
  ): Promise<void> {
    const placaEmUso = await this.prisma.veiculo.findFirst({
      where: { placa, ...(idIgnorado ? { id: { not: idIgnorado } } : {}) },
      select: { id: true },
    });

    if (placaEmUso) {
      throw new RegistroDuplicadoException(
        `Já existe um veículo com a placa ${placa}.`,
      );
    }
  }
}
