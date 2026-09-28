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
import type { CriarClienteDto } from './dto/criar-cliente.dto.js';
import type { AtualizarClienteDto } from './dto/atualizar-cliente.dto.js';
import type {
  ClienteDetalheRespostaDto,
  ClienteRespostaDto,
  VeiculoDoClienteDto,
} from './dto/cliente-resposta.dto.js';
import type { FiltrosClienteQueryDto } from './dto/filtros-cliente-query.dto.js';

/** Campos devolvidos pela API para um cliente. */
const SELECT_CLIENTE = {
  id: true,
  nome: true,
  cpf: true,
  email: true,
  telefone: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ClienteSelect;

/** Veiculo resumido dentro do detalhe do cliente. */
const SELECT_VEICULO_RESUMO = {
  id: true,
  placa: true,
  marca: true,
  modelo: true,
} satisfies Prisma.VeiculoSelect;

/** Veiculo na listagem de veiculos do cliente. */
const SELECT_VEICULO_DO_CLIENTE = {
  ...SELECT_VEICULO_RESUMO,
  ano: true,
  cor: true,
} satisfies Prisma.VeiculoSelect;

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(
    filtros: FiltrosClienteQueryDto,
  ): Promise<RespostaPaginada<ClienteRespostaDto>> {
    const { skip, take } = calcularPaginacao(filtros);
    const where = this.montarFiltros(filtros);

    const [data, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where,
        select: SELECT_CLIENTE,
        orderBy: { nome: 'asc' },
        skip,
        take,
      }),
      this.prisma.cliente.count({ where }),
    ]);

    return montarRespostaPaginada(data, total, filtros);
  }

  async buscarPorId(id: number): Promise<ClienteDetalheRespostaDto> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      select: {
        ...SELECT_CLIENTE,
        veiculos: {
          select: SELECT_VEICULO_RESUMO,
          orderBy: { placa: 'asc' },
        },
      },
    });

    if (!cliente) {
      throw new RecursoNaoEncontradoException('Cliente', id);
    }

    return cliente;
  }

  async listarVeiculos(id: number): Promise<VeiculoDoClienteDto[]> {
    await this.garantirQueExiste(id);

    return this.prisma.veiculo.findMany({
      where: { clienteId: id },
      select: SELECT_VEICULO_DO_CLIENTE,
      orderBy: { placa: 'asc' },
    });
  }

  async criar(dto: CriarClienteDto): Promise<ClienteRespostaDto> {
    await this.garantirDadosUnicos(dto);

    return this.prisma.cliente.create({
      data: dto,
      select: SELECT_CLIENTE,
    });
  }

  async atualizar(
    id: number,
    dto: AtualizarClienteDto,
  ): Promise<ClienteRespostaDto> {
    await this.garantirQueExiste(id);
    await this.garantirDadosUnicos(dto, id);

    return this.prisma.cliente.update({
      where: { id },
      data: dto,
      select: SELECT_CLIENTE,
    });
  }

  async remover(id: number): Promise<void> {
    await this.garantirQueExiste(id);

    const veiculos = await this.prisma.veiculo.count({
      where: { clienteId: id },
    });

    if (veiculos > 0) {
      throw new RecursoEmUsoException(
        `O cliente possui ${veiculos} veículo(s) cadastrado(s) e não pode ser excluído.`,
      );
    }

    await this.prisma.cliente.delete({ where: { id } });
  }

  /** Monta o filtro do Prisma a partir dos query params recebidos. */
  private montarFiltros(
    filtros: FiltrosClienteQueryDto,
  ): Prisma.ClienteWhereInput {
    const where: Prisma.ClienteWhereInput = {};

    if (filtros.nome) {
      where.nome = { contains: filtros.nome, mode: 'insensitive' };
    }

    if (filtros.cpf) {
      where.cpf = filtros.cpf;
    }

    if (filtros.email) {
      where.email = { contains: filtros.email, mode: 'insensitive' };
    }

    return where;
  }

  /** Garante que o cliente existe antes de atualizar, excluir ou listar filhos. */
  private async garantirQueExiste(id: number): Promise<void> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!cliente) {
      throw new RecursoNaoEncontradoException('Cliente', id);
    }
  }

  /**
   * Checa CPF e e-mail antes de gravar, para responder 409 com mensagem
   * especifica em vez de deixar o P2002 do Prisma gerar a mensagem genérica.
   * Em atualizacoes, o proprio registro e ignorado na verificacao.
   */
  private async garantirDadosUnicos(
    dto: CriarClienteDto,
    idIgnorado?: number,
  ): Promise<void> {
    const exceto = idIgnorado ? { id: { not: idIgnorado } } : {};

    const [cpfEmUso, emailEmUso] = await Promise.all([
      this.prisma.cliente.findFirst({
        where: { cpf: dto.cpf, ...exceto },
        select: { id: true },
      }),
      this.prisma.cliente.findFirst({
        where: { email: dto.email, ...exceto },
        select: { id: true },
      }),
    ]);

    if (cpfEmUso) {
      throw new RegistroDuplicadoException(
        'Já existe um cliente com este CPF.',
      );
    }

    if (emailEmUso) {
      throw new RegistroDuplicadoException(
        'Já existe um cliente com este e-mail.',
      );
    }
  }
}
