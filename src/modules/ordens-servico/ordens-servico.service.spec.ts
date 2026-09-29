import { Test, type TestingModule } from '@nestjs/testing';
import { Prisma, StatusOrdemServico } from '@prisma/client';
import {
  OperacaoNaoPermitidaException,
  RecursoNaoEncontradoException,
} from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CriarOrdemServicoDto } from './dto/criar-ordem-servico.dto.js';
import type { FiltrosOrdemServicoQueryDto } from './dto/filtros-ordem-servico-query.dto.js';
import { OrdensServicoService } from './ordens-servico.service.js';

/**
 * PrismaService mockado. O `$transaction` executa a callback recebendo o
 * proprio mock como cliente transacional, para os testes exercitarem o
 * caminho real do service.
 */
function criarPrismaMock() {
  const mock = {
    ordemServico: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    itemOrdemServico: { deleteMany: vi.fn() },
    veiculo: { findUnique: vi.fn() },
    mecanico: { findUnique: vi.fn() },
    servico: { findUnique: vi.fn() },
    cliente: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };

  mock.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
    callback(mock),
  );

  return mock;
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

/** Le o `data` de uma chamada registrada no mock, com tipo conhecido. */
function dataDaChamada<T = Record<string, unknown>>(
  mock: { mock: { calls: unknown[][] } },
  indice = 0,
): T {
  const [argumentos] = mock.mock.calls[indice] as [{ data: T }];

  return argumentos.data;
}

/** Ordem no formato do SELECT_DETALHE, com os itens informados. */
function ordemDetalhe(
  itens: { id: number; quantidade: number; preco: string; servicoId: number }[],
  extras: Record<string, unknown> = {},
) {
  return {
    id: 1,
    status: StatusOrdemServico.ABERTA,
    descricaoProblema: 'Barulho no motor.',
    observacoes: null,
    dataAbertura: new Date('2026-09-01T12:00:00.000Z'),
    dataConclusao: null,
    valorTotal: new Prisma.Decimal('0'),
    createdAt: new Date('2026-09-01T12:00:00.000Z'),
    updatedAt: new Date('2026-09-01T12:00:00.000Z'),
    veiculo: {
      id: 1,
      placa: 'ABC1234',
      marca: 'Fiat',
      modelo: 'Argo',
      cliente: { id: 3, nome: 'Carla', telefone: '47993034455' },
    },
    mecanico: null,
    itens: itens.map((item) => ({
      id: item.id,
      quantidade: item.quantidade,
      precoUnitario: new Prisma.Decimal(item.preco),
      servico: { id: item.servicoId, descricao: `Servico ${item.servicoId}` },
    })),
    ...extras,
  };
}

function filtros(
  extras: Partial<FiltrosOrdemServicoQueryDto> = {},
): FiltrosOrdemServicoQueryDto {
  return { page: 1, limit: 10, ...extras };
}

const DTO_CRIACAO: CriarOrdemServicoDto = {
  veiculoId: 1,
  descricaoProblema: 'Barulho no motor ao acelerar.',
  itens: [
    { servicoId: 1, quantidade: 3 },
    { servicoId: 5, quantidade: 2 },
  ],
};

describe('OrdensServicoService', () => {
  let service: OrdensServicoService;
  let prisma: ReturnType<typeof criarPrismaMock>;

  beforeEach(async () => {
    prisma = criarPrismaMock();

    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        OrdensServicoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = modulo.get(OrdensServicoService);
  });

  describe('listar', () => {
    it('pagina e ordena da mais recente para a mais antiga', async () => {
      prisma.ordemServico.findMany.mockResolvedValue([]);
      prisma.ordemServico.count.mockResolvedValue(30);

      const resposta = await service.listar(filtros({ page: 2, limit: 5 }));

      expect(prisma.ordemServico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          orderBy: [{ dataAbertura: 'desc' }, { id: 'desc' }],
          skip: 5,
          take: 5,
        }),
      );
      expect(resposta).toMatchObject({ page: 2, limit: 5, total: 30 });
    });

    it('filtra por varios status com "in"', async () => {
      prisma.ordemServico.findMany.mockResolvedValue([]);
      prisma.ordemServico.count.mockResolvedValue(0);

      await service.listar(
        filtros({
          status: [StatusOrdemServico.ABERTA, StatusOrdemServico.EM_ANDAMENTO],
        }),
      );

      expect(prisma.ordemServico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ['ABERTA', 'EM_ANDAMENTO'] } },
        }),
      );
    });

    it('filtra por veiculo, mecanico e cliente', async () => {
      prisma.ordemServico.findMany.mockResolvedValue([]);
      prisma.ordemServico.count.mockResolvedValue(0);

      await service.listar(
        filtros({ veiculo_id: 1, mecanico_id: 2, cliente_id: 3 }),
      );

      expect(prisma.ordemServico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            veiculoId: 1,
            mecanicoId: 2,
            veiculo: { clienteId: 3 },
          },
        }),
      );
    });

    it('monta o intervalo de datas inclusivo em UTC', async () => {
      prisma.ordemServico.findMany.mockResolvedValue([]);
      prisma.ordemServico.count.mockResolvedValue(0);

      await service.listar(
        filtros({ data_inicio: '2026-03-01', data_fim: '2026-03-31' }),
      );

      const where = whereDaChamada(prisma.ordemServico.findMany) as {
        dataAbertura: { gte: Date; lte: Date };
      };

      expect(where.dataAbertura.gte.toISOString()).toBe(
        '2026-03-01T00:00:00.000Z',
      );
      expect(where.dataAbertura.lte.toISOString()).toBe(
        '2026-03-31T23:59:59.999Z',
      );
    });
  });

  describe('buscarPorId', () => {
    it('calcula o subtotal de cada item', async () => {
      prisma.ordemServico.findUnique.mockResolvedValue(
        ordemDetalhe([
          { id: 1, quantidade: 3, preco: '189.90', servicoId: 1 },
          { id: 2, quantidade: 2, preco: '320.50', servicoId: 5 },
        ]),
      );

      const ordem = await service.buscarPorId(1);

      expect(ordem.itens.map((item) => item.subtotal.toFixed(2))).toEqual([
        '569.70',
        '641.00',
      ]);
    });

    it('lanca 404 quando a ordem nao existe', async () => {
      prisma.ordemServico.findUnique.mockResolvedValue(null);

      await expect(service.buscarPorId(99)).rejects.toMatchObject({
        erro: 'RECURSO_NAO_ENCONTRADO',
        mensagem: 'Ordem de serviço com id 99 não encontrado.',
      });
    });
  });

  describe('criar', () => {
    beforeEach(() => {
      prisma.veiculo.findUnique.mockResolvedValue({ id: 1 });
      prisma.servico.findUnique.mockImplementation(
        ({ where }: { where: { id: number } }) =>
          where.id === 1
            ? {
                id: 1,
                descricao: 'Troca de oleo',
                preco: new Prisma.Decimal('189.90'),
                ativo: true,
              }
            : {
                id: 5,
                descricao: 'Pastilhas',
                preco: new Prisma.Decimal('320.50'),
                ativo: true,
              },
      );
      prisma.ordemServico.create.mockResolvedValue(
        ordemDetalhe([
          { id: 1, quantidade: 3, preco: '189.90', servicoId: 1 },
          { id: 2, quantidade: 2, preco: '320.50', servicoId: 5 },
        ]),
      );
    });

    it('roda dentro de uma transacao', async () => {
      await service.criar(DTO_CRIACAO);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('copia o preco do catalogo e soma o total com exatidao de centavos', async () => {
      await service.criar(DTO_CRIACAO);

      const data = dataDaChamada<{
        status: string;
        valorTotal: Prisma.Decimal;
        itens: {
          create: { servicoId: number; precoUnitario: Prisma.Decimal }[];
        };
      }>(prisma.ordemServico.create);

      // 189.90 x 3 + 320.50 x 2 = 569.70 + 641.00 = 1210.70
      expect(data.valorTotal.toFixed(2)).toBe('1210.70');
      expect(data.status).toBe(StatusOrdemServico.ABERTA);
      expect(
        data.itens.create.map((item) => item.precoUnitario.toFixed(2)),
      ).toEqual(['189.90', '320.50']);
    });

    it('lanca 404 quando o veiculo nao existe', async () => {
      prisma.veiculo.findUnique.mockResolvedValue(null);

      await expect(service.criar(DTO_CRIACAO)).rejects.toMatchObject({
        status: 404,
        mensagem: 'Veículo com id 1 não encontrado.',
      });
      expect(prisma.ordemServico.create).not.toHaveBeenCalled();
    });

    it('lanca 404 identificando o servico inexistente', async () => {
      prisma.servico.findUnique.mockResolvedValue(null);

      await expect(service.criar(DTO_CRIACAO)).rejects.toMatchObject({
        status: 404,
        mensagem: 'Serviço com id 1 não encontrado.',
      });
    });

    it('lanca 409 quando o servico esta inativo', async () => {
      prisma.servico.findUnique.mockResolvedValue({
        id: 1,
        descricao: 'Polimento tecnico',
        preco: new Prisma.Decimal('50.00'),
        ativo: false,
      });

      await expect(service.criar(DTO_CRIACAO)).rejects.toThrow(
        OperacaoNaoPermitidaException,
      );
      await expect(service.criar(DTO_CRIACAO)).rejects.toMatchObject({
        erro: 'OPERACAO_NAO_PERMITIDA',
        mensagem:
          'O serviço "Polimento tecnico" está inativo e não pode ser lançado em uma ordem de serviço.',
      });
    });

    it('lanca 404 quando o mecanico informado nao existe', async () => {
      prisma.mecanico.findUnique.mockResolvedValue(null);

      await expect(
        service.criar({ ...DTO_CRIACAO, mecanicoId: 9 }),
      ).rejects.toMatchObject({
        status: 404,
        mensagem: 'Mecânico com id 9 não encontrado.',
      });
    });

    it('lanca 409 quando o mecanico informado esta inativo', async () => {
      prisma.mecanico.findUnique.mockResolvedValue({
        id: 5,
        nome: 'Sergio Bonfim',
        ativo: false,
      });

      await expect(
        service.criar({ ...DTO_CRIACAO, mecanicoId: 5 }),
      ).rejects.toMatchObject({
        erro: 'OPERACAO_NAO_PERMITIDA',
        mensagem:
          'O mecânico Sergio Bonfim está inativo e não pode receber ordens de serviço.',
      });
    });
  });

  describe('atualizar', () => {
    const DTO_ATUALIZACAO = {
      descricaoProblema: 'Revisao completa antes da viagem.',
      itens: [
        { servicoId: 1, quantidade: 1 },
        { servicoId: 9, quantidade: 1 },
      ],
    };

    beforeEach(() => {
      prisma.ordemServico.findUnique.mockResolvedValue({
        id: 1,
        status: StatusOrdemServico.ABERTA,
        mecanicoId: null,
        itens: [
          { servicoId: 1, precoUnitario: new Prisma.Decimal('150.00') },
          { servicoId: 5, precoUnitario: new Prisma.Decimal('320.50') },
        ],
      });
      prisma.servico.findUnique.mockResolvedValue({
        id: 9,
        descricao: 'Troca de bateria',
        preco: new Prisma.Decimal('620.00'),
        ativo: true,
      });
      prisma.ordemServico.update.mockResolvedValue(ordemDetalhe([]));
    });

    it('mantem o precoUnitario do servico que ja estava na ordem', async () => {
      await service.atualizar(1, DTO_ATUALIZACAO);

      const data = dataDaChamada<{
        valorTotal: Prisma.Decimal;
        itens: {
          create: { servicoId: number; precoUnitario: Prisma.Decimal }[];
        };
      }>(prisma.ordemServico.update);

      const precos = new Map(
        data.itens.create.map((item) => [
          item.servicoId,
          item.precoUnitario.toFixed(2),
        ]),
      );

      // servico 1 preserva 150.00 (preco da epoca), nao busca o catalogo
      expect(precos.get(1)).toBe('150.00');
      // servico 9 e novo -> usa o preco atual do catalogo
      expect(precos.get(9)).toBe('620.00');
      expect(data.valorTotal.toFixed(2)).toBe('770.00');
    });

    it('nao consulta o catalogo para servico que ja estava na ordem', async () => {
      await service.atualizar(1, DTO_ATUALIZACAO);

      const idsConsultados = prisma.servico.findUnique.mock.calls.map(
        (_chamada, indice) =>
          whereDaChamada(prisma.servico.findUnique, indice).id,
      );

      expect(idsConsultados).toEqual([9]);
    });

    it('apaga os itens antigos antes de gravar os novos, na transacao', async () => {
      await service.atualizar(1, DTO_ATUALIZACAO);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.itemOrdemServico.deleteMany).toHaveBeenCalledWith({
        where: { ordemServicoId: 1 },
      });
    });

    it('lanca 409 ao alterar ordem concluida', async () => {
      prisma.ordemServico.findUnique.mockResolvedValue({
        id: 1,
        status: StatusOrdemServico.CONCLUIDA,
        mecanicoId: 2,
        itens: [],
      });

      await expect(service.atualizar(1, DTO_ATUALIZACAO)).rejects.toMatchObject(
        {
          erro: 'OPERACAO_NAO_PERMITIDA',
          mensagem:
            'Não é possível alterar uma ordem de serviço com status CONCLUIDA.',
        },
      );
      expect(prisma.ordemServico.update).not.toHaveBeenCalled();
    });

    it('lanca 409 ao alterar ordem cancelada', async () => {
      prisma.ordemServico.findUnique.mockResolvedValue({
        id: 1,
        status: StatusOrdemServico.CANCELADA,
        mecanicoId: null,
        itens: [],
      });

      await expect(service.atualizar(1, DTO_ATUALIZACAO)).rejects.toMatchObject(
        {
          mensagem:
            'Não é possível alterar uma ordem de serviço com status CANCELADA.',
        },
      );
    });

    it('permite manter o mesmo mecanico mesmo que ele tenha sido desativado', async () => {
      prisma.ordemServico.findUnique.mockResolvedValue({
        id: 1,
        status: StatusOrdemServico.EM_ANDAMENTO,
        mecanicoId: 5,
        itens: [{ servicoId: 1, precoUnitario: new Prisma.Decimal('150.00') }],
      });
      prisma.mecanico.findUnique.mockResolvedValue({
        id: 5,
        nome: 'Sergio Bonfim',
        ativo: false,
      });

      await expect(
        service.atualizar(1, {
          ...DTO_ATUALIZACAO,
          mecanicoId: 5,
          itens: [{ servicoId: 1, quantidade: 1 }],
        }),
      ).resolves.toBeDefined();
    });

    it('lanca 409 ao trocar para um mecanico inativo', async () => {
      prisma.mecanico.findUnique.mockResolvedValue({
        id: 5,
        nome: 'Sergio Bonfim',
        ativo: false,
      });

      await expect(
        service.atualizar(1, { ...DTO_ATUALIZACAO, mecanicoId: 5 }),
      ).rejects.toMatchObject({
        erro: 'OPERACAO_NAO_PERMITIDA',
        mensagem:
          'O mecânico Sergio Bonfim está inativo e não pode receber ordens de serviço.',
      });
    });

    it('lanca 404 quando a ordem nao existe', async () => {
      prisma.ordemServico.findUnique.mockResolvedValue(null);

      await expect(service.atualizar(99, DTO_ATUALIZACAO)).rejects.toThrow(
        RecursoNaoEncontradoException,
      );
    });
  });

  describe('alterarStatus', () => {
    it('conclui preenchendo a dataConclusao', async () => {
      prisma.ordemServico.findUnique.mockResolvedValue({
        id: 1,
        status: StatusOrdemServico.EM_ANDAMENTO,
        mecanicoId: 2,
      });
      prisma.ordemServico.update.mockResolvedValue(ordemDetalhe([]));

      await service.alterarStatus(1, {
        status: StatusOrdemServico.CONCLUIDA,
      });

      const data = dataDaChamada<{
        status: string;
        dataConclusao: Date | null;
      }>(prisma.ordemServico.update);

      expect(data.status).toBe(StatusOrdemServico.CONCLUIDA);
      expect(data.dataConclusao).toBeInstanceOf(Date);
    });

    it('nao preenche dataConclusao ao cancelar', async () => {
      prisma.ordemServico.findUnique.mockResolvedValue({
        id: 1,
        status: StatusOrdemServico.ABERTA,
        mecanicoId: null,
      });
      prisma.ordemServico.update.mockResolvedValue(ordemDetalhe([]));

      await service.alterarStatus(1, {
        status: StatusOrdemServico.CANCELADA,
      });

      const data = dataDaChamada<{ dataConclusao: Date | null }>(
        prisma.ordemServico.update,
      );

      expect(data.dataConclusao).toBeNull();
    });

    it('lanca 409 em transicao invalida entre estados vivos', async () => {
      prisma.ordemServico.findUnique.mockResolvedValue({
        id: 1,
        status: StatusOrdemServico.ABERTA,
        mecanicoId: 2,
      });

      await expect(
        service.alterarStatus(1, { status: StatusOrdemServico.CONCLUIDA }),
      ).rejects.toMatchObject({
        erro: 'OPERACAO_NAO_PERMITIDA',
        mensagem: 'Transição de status inválida: ABERTA → CONCLUIDA.',
      });
    });

    it('lanca 409 ao tentar transicionar uma ordem em estado final', async () => {
      prisma.ordemServico.findUnique.mockResolvedValue({
        id: 1,
        status: StatusOrdemServico.CONCLUIDA,
        mecanicoId: 2,
      });

      await expect(
        service.alterarStatus(1, { status: StatusOrdemServico.CANCELADA }),
      ).rejects.toMatchObject({
        mensagem:
          'Não é possível alterar uma ordem de serviço com status CONCLUIDA.',
      });
    });

    it('lanca 409 ao iniciar sem mecanico atribuido', async () => {
      prisma.ordemServico.findUnique.mockResolvedValue({
        id: 1,
        status: StatusOrdemServico.ABERTA,
        mecanicoId: null,
      });

      await expect(
        service.alterarStatus(1, { status: StatusOrdemServico.EM_ANDAMENTO }),
      ).rejects.toMatchObject({
        erro: 'OPERACAO_NAO_PERMITIDA',
      });
      expect(prisma.ordemServico.update).not.toHaveBeenCalled();
    });

    it('lanca 404 quando a ordem nao existe', async () => {
      prisma.ordemServico.findUnique.mockResolvedValue(null);

      await expect(
        service.alterarStatus(99, { status: StatusOrdemServico.CANCELADA }),
      ).rejects.toThrow(RecursoNaoEncontradoException);
    });
  });

  describe('remover', () => {
    it('exclui quando a ordem esta aberta', async () => {
      prisma.ordemServico.findUnique.mockResolvedValue({
        status: StatusOrdemServico.ABERTA,
      });

      await service.remover(1);

      expect(prisma.ordemServico.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it.each([
      StatusOrdemServico.EM_ANDAMENTO,
      StatusOrdemServico.CONCLUIDA,
      StatusOrdemServico.CANCELADA,
    ])('lanca 409 orientando o cancelamento quando esta %s', async (status) => {
      prisma.ordemServico.findUnique.mockResolvedValue({ status });

      await expect(service.remover(1)).rejects.toThrow(
        OperacaoNaoPermitidaException,
      );

      const erro = await service.remover(1).then(
        () => null,
        (excecao: unknown) => excecao as { mensagem: string },
      );

      expect(erro?.mensagem).toContain(
        'PATCH /ordens-servico/1/status com CANCELADA',
      );
      expect(prisma.ordemServico.delete).not.toHaveBeenCalled();
    });

    it('lanca 404 quando a ordem nao existe', async () => {
      prisma.ordemServico.findUnique.mockResolvedValue(null);

      await expect(service.remover(99)).rejects.toThrow(
        RecursoNaoEncontradoException,
      );
    });
  });

  describe('endpoints aninhados', () => {
    it('lista o historico do veiculo apos confirmar que ele existe', async () => {
      prisma.veiculo.findUnique.mockResolvedValue({ id: 1 });
      prisma.ordemServico.findMany.mockResolvedValue([]);

      await service.listarPorVeiculo(1, [StatusOrdemServico.ABERTA]);

      expect(prisma.ordemServico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { veiculoId: 1, status: { in: ['ABERTA'] } },
          orderBy: [{ dataAbertura: 'desc' }, { id: 'desc' }],
        }),
      );
    });

    it('lanca 404 quando o veiculo pai nao existe', async () => {
      prisma.veiculo.findUnique.mockResolvedValue(null);

      await expect(service.listarPorVeiculo(99)).rejects.toMatchObject({
        mensagem: 'Veículo com id 99 não encontrado.',
      });
      expect(prisma.ordemServico.findMany).not.toHaveBeenCalled();
    });

    it('lanca 404 quando o mecanico pai nao existe', async () => {
      prisma.mecanico.findUnique.mockResolvedValue(null);

      await expect(service.listarPorMecanico(99)).rejects.toMatchObject({
        mensagem: 'Mecânico com id 99 não encontrado.',
      });
    });

    it('reune as ordens dos veiculos do cliente', async () => {
      prisma.cliente.findUnique.mockResolvedValue({ id: 3 });
      prisma.ordemServico.findMany.mockResolvedValue([]);

      await service.listarPorCliente(3);

      expect(prisma.ordemServico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { veiculo: { clienteId: 3 } } }),
      );
    });

    it('lanca 404 quando o cliente pai nao existe', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);

      await expect(service.listarPorCliente(99)).rejects.toMatchObject({
        mensagem: 'Cliente com id 99 não encontrado.',
      });
    });
  });
});
