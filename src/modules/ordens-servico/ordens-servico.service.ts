import { Injectable } from '@nestjs/common';
import { Prisma, StatusOrdemServico } from '@prisma/client';
import {
  OperacaoNaoPermitidaException,
  RecursoNaoEncontradoException,
} from '../../common/errors/api.exception.js';
import {
  calcularPaginacao,
  montarRespostaPaginada,
  type RespostaPaginada,
} from '../../common/utils/paginacao.js';
import { fimDoDiaUtc, inicioDoDiaUtc } from '../../common/utils/datas.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AlterarStatusDto } from './dto/alterar-status.dto.js';
import type { AtualizarOrdemServicoDto } from './dto/atualizar-ordem-servico.dto.js';
import type { CriarOrdemServicoDto } from './dto/criar-ordem-servico.dto.js';
import type { FiltrosOrdemServicoQueryDto } from './dto/filtros-ordem-servico-query.dto.js';
import type { ItemOrdemServicoDto } from './dto/item-ordem-servico.dto.js';
import {
  ehEstadoFinal,
  ehTransicaoPermitida,
  exigeMecanico,
  permiteAlteracao,
  permiteExclusao,
} from './transicoes-status.js';

/** Campos do formato resumido (listagens e endpoints aninhados). */
const SELECT_RESUMO = {
  id: true,
  status: true,
  dataAbertura: true,
  dataConclusao: true,
  valorTotal: true,
  veiculo: { select: { id: true, placa: true, modelo: true } },
  mecanico: { select: { id: true, nome: true } },
} satisfies Prisma.OrdemServicoSelect;

/** Campos do formato completo (detalhe e respostas de escrita). */
const SELECT_DETALHE = {
  id: true,
  status: true,
  descricaoProblema: true,
  observacoes: true,
  dataAbertura: true,
  dataConclusao: true,
  valorTotal: true,
  createdAt: true,
  updatedAt: true,
  veiculo: {
    select: {
      id: true,
      placa: true,
      marca: true,
      modelo: true,
      cliente: { select: { id: true, nome: true, telefone: true } },
    },
  },
  mecanico: { select: { id: true, nome: true, especialidade: true } },
  itens: {
    select: {
      id: true,
      quantidade: true,
      precoUnitario: true,
      servico: { select: { id: true, descricao: true } },
    },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.OrdemServicoSelect;

export type OrdemServicoResumo = Prisma.OrdemServicoGetPayload<{
  select: typeof SELECT_RESUMO;
}>;

type DetalheDoPrisma = Prisma.OrdemServicoGetPayload<{
  select: typeof SELECT_DETALHE;
}>;

/**
 * Detalhe devolvido pela API: igual ao do Prisma, com `subtotal` calculado em
 * cada item. Os valores sao `Prisma.Decimal` aqui e o `DecimalInterceptor`
 * global os converte em `number` na saida HTTP.
 */
export type OrdemServicoDetalhe = Omit<DetalheDoPrisma, 'itens'> & {
  itens: (DetalheDoPrisma['itens'][number] & { subtotal: Prisma.Decimal })[];
};

/** Item pronto para gravacao, com o preco ja resolvido pelo servidor. */
interface ItemParaGravar {
  servicoId: number;
  quantidade: number;
  precoUnitario: Prisma.Decimal;
}

@Injectable()
export class OrdensServicoService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Leitura
  // -------------------------------------------------------------------------

  async listar(
    filtros: FiltrosOrdemServicoQueryDto,
  ): Promise<RespostaPaginada<OrdemServicoResumo>> {
    const { skip, take } = calcularPaginacao(filtros);
    const where = this.montarFiltros(filtros);

    const [data, total] = await Promise.all([
      this.prisma.ordemServico.findMany({
        where,
        select: SELECT_RESUMO,
        orderBy: [{ dataAbertura: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.ordemServico.count({ where }),
    ]);

    return montarRespostaPaginada(data, total, filtros);
  }

  async buscarPorId(id: number): Promise<OrdemServicoDetalhe> {
    const ordem = await this.prisma.ordemServico.findUnique({
      where: { id },
      select: SELECT_DETALHE,
    });

    if (!ordem) {
      throw new RecursoNaoEncontradoException('Ordem de serviço', id);
    }

    return this.comSubtotais(ordem);
  }

  /** Historico de um veiculo (Veiculo 1:N OrdemServico). */
  async listarPorVeiculo(
    veiculoId: number,
    status?: StatusOrdemServico[],
  ): Promise<OrdemServicoResumo[]> {
    await this.garantirQueVeiculoExiste(veiculoId);

    return this.listarSemPaginacao({ veiculoId }, status);
  }

  /** Ordens atribuidas a um mecanico (Mecanico 1:N OrdemServico). */
  async listarPorMecanico(
    mecanicoId: number,
    status?: StatusOrdemServico[],
  ): Promise<OrdemServicoResumo[]> {
    const mecanico = await this.prisma.mecanico.findUnique({
      where: { id: mecanicoId },
      select: { id: true },
    });

    if (!mecanico) {
      throw new RecursoNaoEncontradoException('Mecânico', mecanicoId);
    }

    return this.listarSemPaginacao({ mecanicoId }, status);
  }

  /** Ordens de todos os veiculos de um cliente. */
  async listarPorCliente(
    clienteId: number,
    status?: StatusOrdemServico[],
  ): Promise<OrdemServicoResumo[]> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true },
    });

    if (!cliente) {
      throw new RecursoNaoEncontradoException('Cliente', clienteId);
    }

    return this.listarSemPaginacao({ veiculo: { clienteId } }, status);
  }

  // -------------------------------------------------------------------------
  // Escrita
  // -------------------------------------------------------------------------

  async criar(dto: CriarOrdemServicoDto): Promise<OrdemServicoDetalhe> {
    return this.prisma.$transaction(async (tx) => {
      await this.garantirQueVeiculoExiste(dto.veiculoId, tx);
      await this.resolverMecanico(dto.mecanicoId ?? null, null, tx);

      const itens = await this.resolverItensNovos(dto.itens, tx);

      const ordem = await tx.ordemServico.create({
        data: {
          veiculoId: dto.veiculoId,
          mecanicoId: dto.mecanicoId ?? null,
          status: StatusOrdemServico.ABERTA,
          descricaoProblema: dto.descricaoProblema,
          observacoes: dto.observacoes ?? null,
          dataAbertura: new Date(),
          valorTotal: this.somarItens(itens),
          itens: { create: itens },
        },
        select: SELECT_DETALHE,
      });

      return this.comSubtotais(ordem);
    });
  }

  async atualizar(
    id: number,
    dto: AtualizarOrdemServicoDto,
  ): Promise<OrdemServicoDetalhe> {
    return this.prisma.$transaction(async (tx) => {
      const atual = await tx.ordemServico.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          mecanicoId: true,
          itens: { select: { servicoId: true, precoUnitario: true } },
        },
      });

      if (!atual) {
        throw new RecursoNaoEncontradoException('Ordem de serviço', id);
      }

      if (!permiteAlteracao(atual.status)) {
        throw new OperacaoNaoPermitidaException(
          `Não é possível alterar uma ordem de serviço com status ${atual.status}.`,
        );
      }

      const mecanicoId = await this.resolverMecanico(
        dto.mecanicoId ?? null,
        atual.mecanicoId,
        tx,
      );

      // Precos vigentes dos itens que ja estavam na ordem.
      const precosAtuais = new Map(
        atual.itens.map((item) => [item.servicoId, item.precoUnitario]),
      );

      const itens = await this.resolverItensNovos(dto.itens, tx, precosAtuais);

      await tx.itemOrdemServico.deleteMany({ where: { ordemServicoId: id } });

      const ordem = await tx.ordemServico.update({
        where: { id },
        data: {
          mecanicoId,
          descricaoProblema: dto.descricaoProblema,
          observacoes: dto.observacoes ?? null,
          valorTotal: this.somarItens(itens),
          itens: { create: itens },
        },
        select: SELECT_DETALHE,
      });

      return this.comSubtotais(ordem);
    });
  }

  async alterarStatus(
    id: number,
    dto: AlterarStatusDto,
  ): Promise<OrdemServicoDetalhe> {
    return this.prisma.$transaction(async (tx) => {
      const atual = await tx.ordemServico.findUnique({
        where: { id },
        select: { id: true, status: true, mecanicoId: true },
      });

      if (!atual) {
        throw new RecursoNaoEncontradoException('Ordem de serviço', id);
      }

      this.garantirTransicao(atual.status, dto.status);

      if (exigeMecanico(dto.status) && atual.mecanicoId === null) {
        throw new OperacaoNaoPermitidaException(
          `A ordem de serviço precisa de um mecânico atribuído para ir para o status ${dto.status}. ` +
            'Informe o mecanicoId em PUT /ordens-servico/' +
            `${id} antes de alterar o status.`,
        );
      }

      const ordem = await tx.ordemServico.update({
        where: { id },
        data: {
          status: dto.status,
          dataConclusao:
            dto.status === StatusOrdemServico.CONCLUIDA ? new Date() : null,
        },
        select: SELECT_DETALHE,
      });

      return this.comSubtotais(ordem);
    });
  }

  async remover(id: number): Promise<void> {
    const ordem = await this.prisma.ordemServico.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!ordem) {
      throw new RecursoNaoEncontradoException('Ordem de serviço', id);
    }

    if (!permiteExclusao(ordem.status)) {
      throw new OperacaoNaoPermitidaException(
        `Só é possível excluir uma ordem de serviço com status ABERTA, e esta está ${ordem.status}. ` +
          `Para encerrá-la sem execução, use PATCH /ordens-servico/${id}/status com CANCELADA.`,
      );
    }

    // Os itens saem em cascata (FK com onDelete: Cascade).
    await this.prisma.ordemServico.delete({ where: { id } });
  }

  // -------------------------------------------------------------------------
  // Apoio
  // -------------------------------------------------------------------------

  /** Monta o filtro do Prisma a partir dos query params recebidos. */
  private montarFiltros(
    filtros: FiltrosOrdemServicoQueryDto,
  ): Prisma.OrdemServicoWhereInput {
    const where: Prisma.OrdemServicoWhereInput = {};

    if (filtros.status?.length) {
      where.status = { in: filtros.status };
    }

    if (filtros.veiculo_id !== undefined) {
      where.veiculoId = filtros.veiculo_id;
    }

    if (filtros.mecanico_id !== undefined) {
      where.mecanicoId = filtros.mecanico_id;
    }

    if (filtros.cliente_id !== undefined) {
      where.veiculo = { clienteId: filtros.cliente_id };
    }

    // Intervalo inclusivo nos dois extremos, interpretado em UTC.
    if (filtros.data_inicio || filtros.data_fim) {
      where.dataAbertura = {
        ...(filtros.data_inicio
          ? { gte: inicioDoDiaUtc(filtros.data_inicio) }
          : {}),
        ...(filtros.data_fim ? { lte: fimDoDiaUtc(filtros.data_fim) } : {}),
      };
    }

    return where;
  }

  /** Listagem sem paginacao usada pelos endpoints aninhados. */
  private listarSemPaginacao(
    where: Prisma.OrdemServicoWhereInput,
    status?: StatusOrdemServico[],
  ): Promise<OrdemServicoResumo[]> {
    return this.prisma.ordemServico.findMany({
      where: {
        ...where,
        ...(status?.length ? { status: { in: status } } : {}),
      },
      select: SELECT_RESUMO,
      orderBy: [{ dataAbertura: 'desc' }, { id: 'desc' }],
    });
  }

  /** Acrescenta o subtotal (quantidade x precoUnitario) a cada item. */
  private comSubtotais(ordem: DetalheDoPrisma): OrdemServicoDetalhe {
    return {
      ...ordem,
      itens: ordem.itens.map((item) => ({
        ...item,
        subtotal: item.precoUnitario.mul(item.quantidade),
      })),
    };
  }

  /** Soma exata dos subtotais, com aritmetica de Decimal. */
  private somarItens(itens: ItemParaGravar[]): Prisma.Decimal {
    return itens.reduce(
      (total, item) => total.add(item.precoUnitario.mul(item.quantidade)),
      new Prisma.Decimal(0),
    );
  }

  /** Traduz a maquina de estados em erro da API. */
  private garantirTransicao(
    de: StatusOrdemServico,
    para: StatusOrdemServico,
  ): void {
    if (ehTransicaoPermitida(de, para)) {
      return;
    }

    if (ehEstadoFinal(de)) {
      throw new OperacaoNaoPermitidaException(
        `Não é possível alterar uma ordem de serviço com status ${de}.`,
      );
    }

    throw new OperacaoNaoPermitidaException(
      `Transição de status inválida: ${de} → ${para}.`,
    );
  }

  private async garantirQueVeiculoExiste(
    veiculoId: number,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const veiculo = await tx.veiculo.findUnique({
      where: { id: veiculoId },
      select: { id: true },
    });

    if (!veiculo) {
      throw new RecursoNaoEncontradoException('Veículo', veiculoId);
    }
  }

  /**
   * Resolve o mecanico informado:
   * - inexistente -> 404;
   * - inativo -> 409, **exceto** quando e o mesmo que ja estava na ordem
   *   (um mecanico desativado depois nao trava a edicao das ordens dele);
   * - null -> desatribui.
   */
  private async resolverMecanico(
    informado: number | null,
    atual: number | null,
    tx: Prisma.TransactionClient,
  ): Promise<number | null> {
    if (informado === null) {
      return null;
    }

    const mecanico = await tx.mecanico.findUnique({
      where: { id: informado },
      select: { id: true, nome: true, ativo: true },
    });

    if (!mecanico) {
      throw new RecursoNaoEncontradoException('Mecânico', informado);
    }

    if (!mecanico.ativo && informado !== atual) {
      throw new OperacaoNaoPermitidaException(
        `O mecânico ${mecanico.nome} está inativo e não pode receber ordens de serviço.`,
      );
    }

    return mecanico.id;
  }

  /**
   * Converte os itens recebidos em itens gravaveis, resolvendo o preco:
   * - servico que **ja estava** na ordem mantem o precoUnitario original,
   *   mesmo que tenha sido desativado no catalogo;
   * - servico **novo** usa o preco atual e precisa estar ativo.
   */
  private async resolverItensNovos(
    itens: ItemOrdemServicoDto[],
    tx: Prisma.TransactionClient,
    precosAtuais = new Map<number, Prisma.Decimal>(),
  ): Promise<ItemParaGravar[]> {
    const resolvidos: ItemParaGravar[] = [];

    for (const item of itens) {
      const precoPreservado = precosAtuais.get(item.servicoId);

      if (precoPreservado) {
        resolvidos.push({
          servicoId: item.servicoId,
          quantidade: item.quantidade,
          precoUnitario: precoPreservado,
        });
        continue;
      }

      const servico = await tx.servico.findUnique({
        where: { id: item.servicoId },
        select: { id: true, descricao: true, preco: true, ativo: true },
      });

      if (!servico) {
        throw new RecursoNaoEncontradoException('Serviço', item.servicoId);
      }

      if (!servico.ativo) {
        throw new OperacaoNaoPermitidaException(
          `O serviço "${servico.descricao}" está inativo e não pode ser lançado em uma ordem de serviço.`,
        );
      }

      resolvidos.push({
        servicoId: servico.id,
        quantidade: item.quantidade,
        precoUnitario: servico.preco,
      });
    }

    return resolvidos;
  }
}
