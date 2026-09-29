import type { INestApplication } from '@nestjs/common';
import { StatusOrdemServico } from '@prisma/client';
import type { App } from 'supertest/types.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import {
  criarAppDeTeste,
  limparDados,
  type ClienteHttpAutenticado,
} from './util-app-teste.js';

interface CorpoErro {
  status: number;
  erro: string;
  mensagem: string;
  detalhes?: { campo: string; mensagem: string }[];
}

interface ItemResposta {
  id: number;
  servico: { id: number; descricao: string };
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

interface OrdemDetalhe {
  id: number;
  status: StatusOrdemServico;
  descricaoProblema: string;
  observacoes: string | null;
  dataAbertura: string;
  dataConclusao: string | null;
  valorTotal: number;
  veiculo: {
    id: number;
    placa: string;
    marca: string;
    modelo: string;
    cliente: { id: number; nome: string; telefone: string };
  };
  mecanico: { id: number; nome: string; especialidade: string } | null;
  itens: ItemResposta[];
}

interface OrdemResumo {
  id: number;
  status: StatusOrdemServico;
  dataAbertura: string;
  dataConclusao: string | null;
  valorTotal: number;
  veiculo: { id: number; placa: string; modelo: string };
  mecanico: { id: number; nome: string } | null;
}

interface ListaOrdens {
  page: number;
  limit: number;
  total: number;
  data: OrdemResumo[];
}

describe('Ordens de servico (e2e)', () => {
  let app: INestApplication<App>;
  let api: ClienteHttpAutenticado;
  let prisma: PrismaService;

  // Ids preparados no beforeEach
  let clienteId: number;
  let veiculoId: number;
  let outroVeiculoId: number;
  let mecanicoId: number;
  let mecanicoInativoId: number;
  let servicoAId: number;
  let servicoBId: number;
  let servicoCId: number;
  let servicoInativoId: number;

  beforeAll(async () => {
    const criado = await criarAppDeTeste();
    app = criado.app as INestApplication<App>;
    api = criado.api;
    prisma = criado.prisma;
  });

  beforeEach(async () => {
    await limparDados(prisma);

    const cliente = await prisma.cliente.create({
      data: {
        nome: 'Carla Menezes Duarte',
        cpf: '52998224725',
        email: 'carla@email.com',
        telefone: '47993034455',
      },
    });
    clienteId = cliente.id;

    const veiculo = await prisma.veiculo.create({
      data: {
        placa: 'ABC1234',
        marca: 'Fiat',
        modelo: 'Argo Drive 1.0',
        ano: 2021,
        cor: 'Branco',
        clienteId,
      },
    });
    veiculoId = veiculo.id;

    const outroVeiculo = await prisma.veiculo.create({
      data: {
        placa: 'RDF5G78',
        marca: 'Chevrolet',
        modelo: 'Onix LT 1.0',
        ano: 2019,
        clienteId,
      },
    });
    outroVeiculoId = outroVeiculo.id;

    const mecanico = await prisma.mecanico.create({
      data: {
        nome: 'Cleber Ramos',
        especialidade: 'Suspensao e freios',
        telefone: '4733441002',
      },
    });
    mecanicoId = mecanico.id;

    const mecanicoInativo = await prisma.mecanico.create({
      data: {
        nome: 'Sergio Bonfim',
        especialidade: 'Funilaria',
        telefone: '4733441005',
        ativo: false,
      },
    });
    mecanicoInativoId = mecanicoInativo.id;

    const [servicoA, servicoB, servicoC, servicoInativo] = await Promise.all([
      prisma.servico.create({
        data: {
          descricao: 'Troca de oleo e filtro',
          preco: 189.9,
          tempoEstimadoMin: 45,
        },
      }),
      prisma.servico.create({
        data: {
          descricao: 'Troca de pastilhas de freio',
          preco: 320.5,
          tempoEstimadoMin: 90,
        },
      }),
      prisma.servico.create({
        data: {
          descricao: 'Troca de bateria 60Ah',
          preco: 620,
          tempoEstimadoMin: 30,
        },
      }),
      prisma.servico.create({
        data: {
          descricao: 'Polimento tecnico',
          preco: 50,
          tempoEstimadoMin: 180,
          ativo: false,
        },
      }),
    ]);

    servicoAId = servicoA.id;
    servicoBId = servicoB.id;
    servicoCId = servicoC.id;
    servicoInativoId = servicoInativo.id;
  });

  afterAll(async () => {
    await limparDados(prisma);
    await app.close();
  });

  /** Corpo valido de criacao: 189.90 x 3 + 320.50 x 2 = 1210.70 */
  function novaOrdem(extras: Record<string, unknown> = {}) {
    return {
      veiculoId,
      descricaoProblema: 'Barulho no motor ao acelerar em subida.',
      itens: [
        { servicoId: servicoAId, quantidade: 3 },
        { servicoId: servicoBId, quantidade: 2 },
      ],
      ...extras,
    };
  }

  /** Cria uma ordem pela API e devolve o detalhe. */
  async function criarOrdem(
    extras: Record<string, unknown> = {},
  ): Promise<OrdemDetalhe> {
    const resposta = await api
      .post('/ordens-servico')
      .send(novaOrdem(extras))
      .expect(201);

    return resposta.body as OrdemDetalhe;
  }

  /** Leva a ordem até o status desejado usando o PATCH. */
  async function levarPara(
    id: number,
    status: StatusOrdemServico,
  ): Promise<void> {
    const caminho: StatusOrdemServico[] =
      status === StatusOrdemServico.CONCLUIDA
        ? [StatusOrdemServico.EM_ANDAMENTO, StatusOrdemServico.CONCLUIDA]
        : [status];

    for (const passo of caminho) {
      await api
        .patch(`/ordens-servico/${id}/status`)
        .send({ status: passo })
        .expect(200);
    }
  }

  // -------------------------------------------------------------------------
  describe('POST /ordens-servico', () => {
    it('abre a ordem com status ABERTA, valorTotal e subtotais corretos', async () => {
      const ordem = await criarOrdem({ mecanicoId });

      expect(ordem).toMatchObject({
        status: StatusOrdemServico.ABERTA,
        dataConclusao: null,
        valorTotal: 1210.7,
        veiculo: {
          id: veiculoId,
          placa: 'ABC1234',
          marca: 'Fiat',
          cliente: { id: clienteId, nome: 'Carla Menezes Duarte' },
        },
        mecanico: { id: mecanicoId, especialidade: 'Suspensao e freios' },
      });
      expect(typeof ordem.valorTotal).toBe('number');
      expect(ordem.itens).toHaveLength(2);
      expect(ordem.itens.map((item) => item.subtotal)).toEqual([569.7, 641]);
      expect(ordem.itens.map((item) => item.precoUnitario)).toEqual([
        189.9, 320.5,
      ]);
      expect(new Date(ordem.dataAbertura).getTime()).toBeLessThanOrEqual(
        Date.now(),
      );
    });

    it('aceita ordem sem mecanico atribuido', async () => {
      const ordem = await criarOrdem();

      expect(ordem.mecanico).toBeNull();
    });

    it('responde 400 com detalhes por campo invalido', async () => {
      const resposta = await api
        .post('/ordens-servico')
        .send({ veiculoId: 0, descricaoProblema: 'abc', itens: [] })
        .expect(400);

      const corpo = resposta.body as CorpoErro;

      expect(corpo.erro).toBe('DADOS_INVALIDOS');
      expect((corpo.detalhes ?? []).map((d) => d.campo).sort()).toEqual([
        'descricaoProblema',
        'itens',
        'veiculoId',
      ]);
    });

    it('responde 400 quando o mesmo servicoId aparece duas vezes', async () => {
      const resposta = await api
        .post('/ordens-servico')
        .send(
          novaOrdem({
            itens: [
              { servicoId: servicoAId, quantidade: 1 },
              { servicoId: servicoAId, quantidade: 2 },
            ],
          }),
        )
        .expect(400);

      expect((resposta.body as CorpoErro).detalhes).toEqual([
        {
          campo: 'itens',
          mensagem: 'itens não pode repetir o mesmo servicoId',
        },
      ]);
    });

    it.each(['status', 'valorTotal', 'dataAbertura', 'dataConclusao'])(
      'responde 400 quando o campo controlado pelo servidor (%s) e enviado',
      async (campo) => {
        const resposta = await api
          .post('/ordens-servico')
          .send(novaOrdem({ [campo]: 'qualquer' }))
          .expect(400);

        expect(
          ((resposta.body as CorpoErro).detalhes ?? []).map((d) => d.campo),
        ).toContain(campo);
      },
    );

    it('responde 400 quando precoUnitario e enviado no item', async () => {
      const resposta = await api
        .post('/ordens-servico')
        .send(
          novaOrdem({
            itens: [{ servicoId: servicoAId, quantidade: 1, precoUnitario: 1 }],
          }),
        )
        .expect(400);

      expect(
        ((resposta.body as CorpoErro).detalhes ?? []).map((d) => d.campo),
      ).toContain('itens.0.precoUnitario');
    });

    it('responde 404 quando o veiculo nao existe', async () => {
      const resposta = await api
        .post('/ordens-servico')
        .send(novaOrdem({ veiculoId: 9999 }))
        .expect(404);

      expect((resposta.body as CorpoErro).mensagem).toBe(
        'Veículo com id 9999 não encontrado.',
      );
    });

    it('responde 404 quando o mecanico nao existe', async () => {
      const resposta = await api
        .post('/ordens-servico')
        .send(novaOrdem({ mecanicoId: 9999 }))
        .expect(404);

      expect((resposta.body as CorpoErro).mensagem).toBe(
        'Mecânico com id 9999 não encontrado.',
      );
    });

    it('responde 404 identificando o servico inexistente', async () => {
      const resposta = await api
        .post('/ordens-servico')
        .send(novaOrdem({ itens: [{ servicoId: 9999, quantidade: 1 }] }))
        .expect(404);

      expect((resposta.body as CorpoErro).mensagem).toBe(
        'Serviço com id 9999 não encontrado.',
      );
    });

    it('responde 409 quando o mecanico esta inativo', async () => {
      const resposta = await api
        .post('/ordens-servico')
        .send(novaOrdem({ mecanicoId: mecanicoInativoId }))
        .expect(409);

      expect(resposta.body).toMatchObject({
        erro: 'OPERACAO_NAO_PERMITIDA',
        mensagem:
          'O mecânico Sergio Bonfim está inativo e não pode receber ordens de serviço.',
      });
    });

    it('responde 409 quando o servico esta inativo', async () => {
      const resposta = await api
        .post('/ordens-servico')
        .send(
          novaOrdem({
            itens: [{ servicoId: servicoInativoId, quantidade: 1 }],
          }),
        )
        .expect(409);

      expect(resposta.body).toMatchObject({
        erro: 'OPERACAO_NAO_PERMITIDA',
        mensagem:
          'O serviço "Polimento tecnico" está inativo e não pode ser lançado em uma ordem de serviço.',
      });
    });

    it('nao grava nada quando a validacao de negocio falha (transacao)', async () => {
      await api
        .post('/ordens-servico')
        .send(novaOrdem({ itens: [{ servicoId: 9999, quantidade: 1 }] }))
        .expect(404);

      await expect(prisma.ordemServico.count()).resolves.toBe(0);
      await expect(prisma.itemOrdemServico.count()).resolves.toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('preco congelado no item', () => {
    it('reajuste no catalogo nao altera ordem existente', async () => {
      const ordem = await criarOrdem();

      await api
        .put(`/servicos/${servicoAId}`)
        .send({
          descricao: 'Troca de oleo e filtro',
          preco: 249.9,
          tempoEstimadoMin: 45,
          ativo: true,
        })
        .expect(200);

      const depois = await api.get(`/ordens-servico/${ordem.id}`).expect(200);

      const corpo = depois.body as OrdemDetalhe;

      expect(corpo.valorTotal).toBe(1210.7);
      expect(corpo.itens[0].precoUnitario).toBe(189.9);
    });
  });

  // -------------------------------------------------------------------------
  describe('PUT /ordens-servico/:id', () => {
    it('substitui itens mantendo o preco do que ja estava e usando o atual no novo', async () => {
      const ordem = await criarOrdem();

      // reajusta o servico A depois da abertura
      await api
        .put(`/servicos/${servicoAId}`)
        .send({
          descricao: 'Troca de oleo e filtro',
          preco: 249.9,
          tempoEstimadoMin: 45,
          ativo: true,
        })
        .expect(200);

      // mantem A (1x), remove B, acrescenta C
      const resposta = await api
        .put(`/ordens-servico/${ordem.id}`)
        .send({
          descricaoProblema: 'Revisao completa antes da viagem.',
          observacoes: 'Cliente autorizou por telefone.',
          itens: [
            { servicoId: servicoAId, quantidade: 1 },
            { servicoId: servicoCId, quantidade: 1 },
          ],
        })
        .expect(200);

      const corpo = resposta.body as OrdemDetalhe;
      const precos = new Map(
        corpo.itens.map((item) => [item.servico.id, item.precoUnitario]),
      );

      expect(corpo.itens).toHaveLength(2);
      expect(precos.get(servicoAId)).toBe(189.9); // preco congelado
      expect(precos.get(servicoCId)).toBe(620); // preco atual
      expect(precos.has(servicoBId)).toBe(false);
      expect(corpo.valorTotal).toBe(809.9);
      expect(corpo.observacoes).toBe('Cliente autorizou por telefone.');
    });

    it('permite relancar um servico que foi desativado apos entrar na ordem', async () => {
      const ordem = await criarOrdem();

      await api
        .put(`/servicos/${servicoAId}`)
        .send({
          descricao: 'Troca de oleo e filtro',
          preco: 189.9,
          tempoEstimadoMin: 45,
          ativo: false,
        })
        .expect(200);

      const resposta = await api
        .put(`/ordens-servico/${ordem.id}`)
        .send({
          descricaoProblema: 'Somente a troca de oleo.',
          itens: [{ servicoId: servicoAId, quantidade: 1 }],
        })
        .expect(200);

      expect((resposta.body as OrdemDetalhe).valorTotal).toBe(189.9);
    });

    it('responde 409 ao incluir um servico inativo que nao estava na ordem', async () => {
      const ordem = await criarOrdem();

      const resposta = await api
        .put(`/ordens-servico/${ordem.id}`)
        .send({
          descricaoProblema: 'Incluindo servico inativo.',
          itens: [{ servicoId: servicoInativoId, quantidade: 1 }],
        })
        .expect(409);

      expect((resposta.body as CorpoErro).erro).toBe('OPERACAO_NAO_PERMITIDA');
    });

    it('atribui e desatribui mecanico', async () => {
      const ordem = await criarOrdem();

      const comMecanico = await api
        .put(`/ordens-servico/${ordem.id}`)
        .send({
          mecanicoId,
          descricaoProblema: 'Barulho no motor ao acelerar em subida.',
          itens: [{ servicoId: servicoAId, quantidade: 1 }],
        })
        .expect(200);

      expect((comMecanico.body as OrdemDetalhe).mecanico?.id).toBe(mecanicoId);

      const semMecanico = await api
        .put(`/ordens-servico/${ordem.id}`)
        .send({
          mecanicoId: null,
          descricaoProblema: 'Barulho no motor ao acelerar em subida.',
          itens: [{ servicoId: servicoAId, quantidade: 1 }],
        })
        .expect(200);

      expect((semMecanico.body as OrdemDetalhe).mecanico).toBeNull();
    });

    it('responde 400 quando veiculoId e enviado (veiculo e imutavel)', async () => {
      const ordem = await criarOrdem();

      const resposta = await api
        .put(`/ordens-servico/${ordem.id}`)
        .send({
          veiculoId: outroVeiculoId,
          descricaoProblema: 'Tentando trocar o veiculo.',
          itens: [{ servicoId: servicoAId, quantidade: 1 }],
        })
        .expect(400);

      expect(
        ((resposta.body as CorpoErro).detalhes ?? []).map((d) => d.campo),
      ).toContain('veiculoId');
    });

    it('responde 404 quando a ordem nao existe', async () => {
      await api
        .put('/ordens-servico/9999')
        .send({
          descricaoProblema: 'Ordem inexistente.',
          itens: [{ servicoId: servicoAId, quantidade: 1 }],
        })
        .expect(404);
    });
  });

  // -------------------------------------------------------------------------
  describe('PATCH /ordens-servico/:id/status', () => {
    it('percorre o fluxo feliz ABERTA -> EM_ANDAMENTO -> CONCLUIDA', async () => {
      const ordem = await criarOrdem({ mecanicoId });

      const emAndamento = await api
        .patch(`/ordens-servico/${ordem.id}/status`)
        .send({ status: StatusOrdemServico.EM_ANDAMENTO })
        .expect(200);

      expect(emAndamento.body).toMatchObject({
        status: StatusOrdemServico.EM_ANDAMENTO,
        dataConclusao: null,
      });

      const concluida = await api
        .patch(`/ordens-servico/${ordem.id}/status`)
        .send({ status: StatusOrdemServico.CONCLUIDA })
        .expect(200);

      const corpo = concluida.body as OrdemDetalhe;

      expect(corpo.status).toBe(StatusOrdemServico.CONCLUIDA);
      expect(corpo.dataConclusao).not.toBeNull();
      expect(new Date(corpo.dataConclusao!).getTime()).toBeGreaterThanOrEqual(
        new Date(corpo.dataAbertura).getTime(),
      );
    });

    it('permite cancelar direto de ABERTA, sem mecanico', async () => {
      const ordem = await criarOrdem();

      const resposta = await api
        .patch(`/ordens-servico/${ordem.id}/status`)
        .send({ status: StatusOrdemServico.CANCELADA })
        .expect(200);

      expect(resposta.body).toMatchObject({
        status: StatusOrdemServico.CANCELADA,
        dataConclusao: null,
      });
    });

    it('responde 409 em ABERTA -> CONCLUIDA', async () => {
      const ordem = await criarOrdem({ mecanicoId });

      const resposta = await api
        .patch(`/ordens-servico/${ordem.id}/status`)
        .send({ status: StatusOrdemServico.CONCLUIDA })
        .expect(409);

      expect(resposta.body).toMatchObject({
        erro: 'OPERACAO_NAO_PERMITIDA',
        mensagem: 'Transição de status inválida: ABERTA → CONCLUIDA.',
      });
    });

    it('responde 409 ao iniciar sem mecanico atribuido', async () => {
      const ordem = await criarOrdem();

      const resposta = await api
        .patch(`/ordens-servico/${ordem.id}/status`)
        .send({ status: StatusOrdemServico.EM_ANDAMENTO })
        .expect(409);

      expect((resposta.body as CorpoErro).mensagem).toContain(
        'precisa de um mecânico atribuído',
      );
    });

    it.each([
      StatusOrdemServico.ABERTA,
      StatusOrdemServico.EM_ANDAMENTO,
      StatusOrdemServico.CANCELADA,
      StatusOrdemServico.CONCLUIDA,
    ])(
      'responde 409 ao transicionar uma ordem CONCLUIDA para %s',
      async (destino) => {
        const ordem = await criarOrdem({ mecanicoId });
        await levarPara(ordem.id, StatusOrdemServico.CONCLUIDA);

        const resposta = await api
          .patch(`/ordens-servico/${ordem.id}/status`)
          .send({ status: destino })
          .expect(409);

        expect((resposta.body as CorpoErro).mensagem).toBe(
          'Não é possível alterar uma ordem de serviço com status CONCLUIDA.',
        );
      },
    );

    it('responde 409 ao transicionar uma ordem CANCELADA', async () => {
      const ordem = await criarOrdem();
      await levarPara(ordem.id, StatusOrdemServico.CANCELADA);

      const resposta = await api
        .patch(`/ordens-servico/${ordem.id}/status`)
        .send({ status: StatusOrdemServico.EM_ANDAMENTO })
        .expect(409);

      expect((resposta.body as CorpoErro).mensagem).toBe(
        'Não é possível alterar uma ordem de serviço com status CANCELADA.',
      );
    });

    it('responde 400 para status fora do enum', async () => {
      const ordem = await criarOrdem();

      const resposta = await api
        .patch(`/ordens-servico/${ordem.id}/status`)
        .send({ status: 'PAUSADA' })
        .expect(400);

      expect(
        ((resposta.body as CorpoErro).detalhes ?? []).map((d) => d.campo),
      ).toContain('status');
    });

    it('responde 404 quando a ordem nao existe', async () => {
      await api
        .patch('/ordens-servico/9999/status')
        .send({ status: StatusOrdemServico.CANCELADA })
        .expect(404);
    });
  });

  // -------------------------------------------------------------------------
  describe('alteracoes em ordens finalizadas', () => {
    it('PUT em ordem concluida responde 409', async () => {
      const ordem = await criarOrdem({ mecanicoId });
      await levarPara(ordem.id, StatusOrdemServico.CONCLUIDA);

      const resposta = await api
        .put(`/ordens-servico/${ordem.id}`)
        .send({
          descricaoProblema: 'Tentando alterar depois de concluir.',
          itens: [{ servicoId: servicoAId, quantidade: 1 }],
        })
        .expect(409);

      expect((resposta.body as CorpoErro).mensagem).toBe(
        'Não é possível alterar uma ordem de serviço com status CONCLUIDA.',
      );
    });

    it('PUT em ordem cancelada responde 409', async () => {
      const ordem = await criarOrdem();
      await levarPara(ordem.id, StatusOrdemServico.CANCELADA);

      await api
        .put(`/ordens-servico/${ordem.id}`)
        .send({
          descricaoProblema: 'Tentando alterar depois de cancelar.',
          itens: [{ servicoId: servicoAId, quantidade: 1 }],
        })
        .expect(409);
    });
  });

  // -------------------------------------------------------------------------
  describe('DELETE /ordens-servico/:id', () => {
    it('exclui ordem aberta com 204 e remove os itens em cascata', async () => {
      const ordem = await criarOrdem();

      const resposta = await api
        .delete(`/ordens-servico/${ordem.id}`)
        .expect(204);

      expect(resposta.text).toBe('');
      await expect(
        prisma.ordemServico.findUnique({ where: { id: ordem.id } }),
      ).resolves.toBeNull();
      await expect(
        prisma.itemOrdemServico.count({
          where: { ordemServicoId: ordem.id },
        }),
      ).resolves.toBe(0);
    });

    it('responde 409 orientando o cancelamento quando esta EM_ANDAMENTO', async () => {
      const ordem = await criarOrdem({ mecanicoId });
      await levarPara(ordem.id, StatusOrdemServico.EM_ANDAMENTO);

      const resposta = await api
        .delete(`/ordens-servico/${ordem.id}`)
        .expect(409);

      const corpo = resposta.body as CorpoErro;

      expect(corpo.erro).toBe('OPERACAO_NAO_PERMITIDA');
      expect(corpo.mensagem).toContain(
        `PATCH /ordens-servico/${ordem.id}/status com CANCELADA`,
      );
    });

    it.each([StatusOrdemServico.CONCLUIDA, StatusOrdemServico.CANCELADA])(
      'responde 409 quando esta %s',
      async (status) => {
        const ordem = await criarOrdem({ mecanicoId });
        await levarPara(ordem.id, status);

        await api.delete(`/ordens-servico/${ordem.id}`).expect(409);
      },
    );

    it('responde 404 quando a ordem nao existe', async () => {
      await api.delete('/ordens-servico/9999').expect(404);
    });
  });

  // -------------------------------------------------------------------------
  describe('GET /ordens-servico', () => {
    beforeEach(async () => {
      // 3 ordens com datas e status distintos
      await prisma.ordemServico.create({
        data: {
          veiculoId,
          mecanicoId,
          status: StatusOrdemServico.CONCLUIDA,
          descricaoProblema: 'Revisao antiga',
          dataAbertura: new Date('2026-03-01T10:00:00.000Z'),
          dataConclusao: new Date('2026-03-03T10:00:00.000Z'),
          valorTotal: 189.9,
          itens: {
            create: [
              { servicoId: servicoAId, quantidade: 1, precoUnitario: 189.9 },
            ],
          },
        },
      });
      await prisma.ordemServico.create({
        data: {
          veiculoId: outroVeiculoId,
          status: StatusOrdemServico.ABERTA,
          descricaoProblema: 'Ordem do meio',
          dataAbertura: new Date('2026-03-31T23:59:00.000Z'),
          valorTotal: 320.5,
          itens: {
            create: [
              { servicoId: servicoBId, quantidade: 1, precoUnitario: 320.5 },
            ],
          },
        },
      });
      await prisma.ordemServico.create({
        data: {
          veiculoId,
          mecanicoId,
          status: StatusOrdemServico.EM_ANDAMENTO,
          descricaoProblema: 'Ordem recente',
          dataAbertura: new Date('2026-04-01T00:00:00.000Z'),
          valorTotal: 620,
          itens: {
            create: [
              { servicoId: servicoCId, quantidade: 1, precoUnitario: 620 },
            ],
          },
        },
      });
    });

    it('lista no formato resumido, da mais recente para a mais antiga', async () => {
      const resposta = await api.get('/ordens-servico').expect(200);

      const corpo = resposta.body as ListaOrdens;

      expect(corpo).toMatchObject({ page: 1, limit: 10, total: 3 });
      // O resumo nao expoe os campos do detalhe.
      for (const ordem of corpo.data) {
        expect(ordem).not.toHaveProperty('descricaoProblema');
        expect(ordem).not.toHaveProperty('observacoes');
        expect(ordem).not.toHaveProperty('itens');
      }
      expect(corpo.data[0]).toMatchObject({
        status: StatusOrdemServico.EM_ANDAMENTO,
        veiculo: { placa: 'ABC1234', modelo: 'Argo Drive 1.0' },
        mecanico: { id: mecanicoId, nome: 'Cleber Ramos' },
      });
      expect(corpo.data[0]).not.toHaveProperty('itens');
      expect(corpo.data[1].mecanico).toBeNull();
      expect(typeof corpo.data[0].valorTotal).toBe('number');
    });

    it('pagina', async () => {
      const resposta = await api
        .get('/ordens-servico?page=2&limit=2')
        .expect(200);

      const corpo = resposta.body as ListaOrdens;

      expect(corpo).toMatchObject({ page: 2, limit: 2, total: 3 });
      expect(corpo.data).toHaveLength(1);
    });

    it('filtra por um status', async () => {
      const resposta = await api
        .get('/ordens-servico?status=ABERTA')
        .expect(200);

      expect((resposta.body as ListaOrdens).total).toBe(1);
    });

    it('filtra por varios status separados por virgula', async () => {
      const resposta = await api
        .get('/ordens-servico?status=ABERTA,EM_ANDAMENTO')
        .expect(200);

      const corpo = resposta.body as ListaOrdens;

      expect(corpo.total).toBe(2);
      expect(corpo.data.map((o) => o.status).sort()).toEqual([
        'ABERTA',
        'EM_ANDAMENTO',
      ]);
    });

    it.each(['INVALIDO', 'aberta', 'ABERTA,INVALIDO'])(
      'responde 400 para status=%s',
      async (valor) => {
        const resposta = await api
          .get(`/ordens-servico?status=${valor}`)
          .expect(400);

        expect(
          ((resposta.body as CorpoErro).detalhes ?? []).map((d) => d.campo),
        ).toContain('status');
      },
    );

    it('filtra por veiculo_id', async () => {
      const resposta = await api
        .get(`/ordens-servico?veiculo_id=${veiculoId}`)
        .expect(200);

      expect((resposta.body as ListaOrdens).total).toBe(2);
    });

    it('filtra por mecanico_id', async () => {
      const resposta = await api
        .get(`/ordens-servico?mecanico_id=${mecanicoId}`)
        .expect(200);

      expect((resposta.body as ListaOrdens).total).toBe(2);
    });

    it('filtra por cliente_id reunindo os veiculos do cliente', async () => {
      const resposta = await api
        .get(`/ordens-servico?cliente_id=${clienteId}`)
        .expect(200);

      expect((resposta.body as ListaOrdens).total).toBe(3);
    });

    it('filtra pelo intervalo de datas com os dois extremos inclusivos', async () => {
      const resposta = await api
        .get('/ordens-servico?data_inicio=2026-03-01&data_fim=2026-03-31')
        .expect(200);

      const corpo = resposta.body as ListaOrdens;

      // inclui a de 01/03 as 10:00 e a de 31/03 as 23:59, exclui a de 01/04
      expect(corpo.total).toBe(2);
    });

    it('filtra somente pela data inicial', async () => {
      const resposta = await api
        .get('/ordens-servico?data_inicio=2026-04-01')
        .expect(200);

      expect((resposta.body as ListaOrdens).total).toBe(1);
    });

    it('filtra somente pela data final', async () => {
      const resposta = await api
        .get('/ordens-servico?data_fim=2026-03-01')
        .expect(200);

      expect((resposta.body as ListaOrdens).total).toBe(1);
    });

    it('responde 400 quando data_inicio e maior que data_fim', async () => {
      const resposta = await api
        .get('/ordens-servico?data_inicio=2026-04-01&data_fim=2026-03-01')
        .expect(400);

      expect((resposta.body as CorpoErro).detalhes).toEqual([
        {
          campo: 'data_inicio',
          mensagem: 'data_inicio não pode ser maior que data_fim',
        },
      ]);
    });

    it.each(['01/03/2026', '2026-3-1', 'ontem'])(
      'responde 400 para data_inicio=%s',
      async (valor) => {
        const resposta = await api
          .get(`/ordens-servico?data_inicio=${encodeURIComponent(valor)}`)
          .expect(400);

        expect(
          ((resposta.body as CorpoErro).detalhes ?? []).map((d) => d.campo),
        ).toContain('data_inicio');
      },
    );

    it('combina status e intervalo de datas', async () => {
      const resposta = await api
        .get(
          '/ordens-servico?status=ABERTA,EM_ANDAMENTO&data_inicio=2026-03-31&data_fim=2026-04-01',
        )
        .expect(200);

      expect((resposta.body as ListaOrdens).total).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  describe('GET /ordens-servico/:id', () => {
    it('devolve o detalhe completo', async () => {
      const criada = await criarOrdem({ mecanicoId });

      const resposta = await api
        .get(`/ordens-servico/${criada.id}`)
        .expect(200);

      const corpo = resposta.body as OrdemDetalhe;

      expect(corpo).toMatchObject({
        id: criada.id,
        descricaoProblema: 'Barulho no motor ao acelerar em subida.',
        valorTotal: 1210.7,
      });
      expect(corpo.itens[0].servico).toMatchObject({
        id: servicoAId,
        descricao: 'Troca de oleo e filtro',
      });
    });

    it('responde 404 quando a ordem nao existe', async () => {
      const resposta = await api.get('/ordens-servico/9999').expect(404);

      expect(resposta.body).toEqual({
        status: 404,
        erro: 'RECURSO_NAO_ENCONTRADO',
        mensagem: 'Ordem de serviço com id 9999 não encontrado.',
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('endpoints aninhados', () => {
    beforeEach(async () => {
      await criarOrdem({ mecanicoId }); // ABERTA no veiculo principal
      const paraCancelar = await criarOrdem({
        itens: [{ servicoId: servicoCId, quantidade: 1 }],
      });
      await levarPara(paraCancelar.id, StatusOrdemServico.CANCELADA);
    });

    it('GET /veiculos/:id/ordens-servico devolve o historico do veiculo', async () => {
      const resposta = await api
        .get(`/veiculos/${veiculoId}/ordens-servico`)
        .expect(200);

      const ordens = resposta.body as OrdemResumo[];

      expect(ordens).toHaveLength(2);
      expect(ordens.every((o) => o.veiculo.id === veiculoId)).toBe(true);
      expect(ordens[0]).not.toHaveProperty('itens');
    });

    it('GET /veiculos/:id/ordens-servico aceita o filtro de status', async () => {
      const resposta = await api
        .get(`/veiculos/${veiculoId}/ordens-servico?status=CANCELADA`)
        .expect(200);

      const ordens = resposta.body as OrdemResumo[];

      expect(ordens).toHaveLength(1);
      expect(ordens[0].status).toBe(StatusOrdemServico.CANCELADA);
    });

    it('GET /veiculos/:id/ordens-servico devolve array vazio sem historico', async () => {
      const resposta = await api
        .get(`/veiculos/${outroVeiculoId}/ordens-servico`)
        .expect(200);

      expect(resposta.body).toEqual([]);
    });

    it('GET /veiculos/:id/ordens-servico responde 404 para veiculo inexistente', async () => {
      const resposta = await api
        .get('/veiculos/9999/ordens-servico')
        .expect(404);

      expect((resposta.body as CorpoErro).mensagem).toBe(
        'Veículo com id 9999 não encontrado.',
      );
    });

    it('GET /mecanicos/:id/ordens-servico devolve as ordens do mecanico', async () => {
      const resposta = await api
        .get(`/mecanicos/${mecanicoId}/ordens-servico`)
        .expect(200);

      const ordens = resposta.body as OrdemResumo[];

      expect(ordens).toHaveLength(1);
      expect(ordens[0].mecanico?.id).toBe(mecanicoId);
    });

    it('GET /mecanicos/:id/ordens-servico devolve vazio para mecanico sem ordens', async () => {
      const resposta = await api
        .get(`/mecanicos/${mecanicoInativoId}/ordens-servico`)
        .expect(200);

      expect(resposta.body).toEqual([]);
    });

    it('GET /mecanicos/:id/ordens-servico responde 404 para mecanico inexistente', async () => {
      await api.get('/mecanicos/9999/ordens-servico').expect(404);
    });

    it('GET /clientes/:id/ordens-servico reune as ordens dos veiculos do cliente', async () => {
      const resposta = await api
        .get(`/clientes/${clienteId}/ordens-servico`)
        .expect(200);

      expect(resposta.body as OrdemResumo[]).toHaveLength(2);
    });

    it('GET /clientes/:id/ordens-servico aceita o filtro de status', async () => {
      const resposta = await api
        .get(`/clientes/${clienteId}/ordens-servico?status=ABERTA`)
        .expect(200);

      expect(resposta.body as OrdemResumo[]).toHaveLength(1);
    });

    it('GET /clientes/:id/ordens-servico responde 404 para cliente inexistente', async () => {
      await api.get('/clientes/9999/ordens-servico').expect(404);
    });

    it('responde 400 para status invalido no endpoint aninhado', async () => {
      const resposta = await api
        .get(`/veiculos/${veiculoId}/ordens-servico?status=INVALIDO`)
        .expect(400);

      expect((resposta.body as CorpoErro).erro).toBe('DADOS_INVALIDOS');
    });
  });
});
