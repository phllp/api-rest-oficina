import { StatusOrdemServico } from '@prisma/client';
import {
  ehEstadoFinal,
  ehTransicaoPermitida,
  exigeMecanico,
  permiteAlteracao,
  permiteExclusao,
  TRANSICOES_PERMITIDAS,
} from './transicoes-status.js';

const TODOS_OS_STATUS = Object.values(StatusOrdemServico);

/** Matriz completa origem x destino: true onde a transicao e permitida. */
const MATRIZ_ESPERADA: Record<
  StatusOrdemServico,
  Record<StatusOrdemServico, boolean>
> = {
  ABERTA: {
    ABERTA: false,
    EM_ANDAMENTO: true,
    CONCLUIDA: false,
    CANCELADA: true,
  },
  EM_ANDAMENTO: {
    ABERTA: false,
    EM_ANDAMENTO: false,
    CONCLUIDA: true,
    CANCELADA: true,
  },
  CONCLUIDA: {
    ABERTA: false,
    EM_ANDAMENTO: false,
    CONCLUIDA: false,
    CANCELADA: false,
  },
  CANCELADA: {
    ABERTA: false,
    EM_ANDAMENTO: false,
    CONCLUIDA: false,
    CANCELADA: false,
  },
};

describe('ehTransicaoPermitida', () => {
  // 4 x 4 = 16 combinacoes, nenhuma deixada de fora.
  for (const de of TODOS_OS_STATUS) {
    for (const para of TODOS_OS_STATUS) {
      const esperado = MATRIZ_ESPERADA[de][para];

      it(`${de} -> ${para} deve ser ${esperado ? 'permitida' : 'recusada'}`, () => {
        expect(ehTransicaoPermitida(de, para)).toBe(esperado);
      });
    }
  }

  it('nao permite transicao de um status para ele mesmo', () => {
    for (const status of TODOS_OS_STATUS) {
      expect(ehTransicaoPermitida(status, status)).toBe(false);
    }
  });

  it('cobre todos os status do enum no mapa de transicoes', () => {
    expect(Object.keys(TRANSICOES_PERMITIDAS).sort()).toEqual(
      [...TODOS_OS_STATUS].sort(),
    );
  });
});

describe('ehEstadoFinal', () => {
  it.each([
    [StatusOrdemServico.ABERTA, false],
    [StatusOrdemServico.EM_ANDAMENTO, false],
    [StatusOrdemServico.CONCLUIDA, true],
    [StatusOrdemServico.CANCELADA, true],
  ])('%s -> %s', (status, esperado) => {
    expect(ehEstadoFinal(status)).toBe(esperado);
  });

  it('estado final nao tem nenhuma transicao de saida', () => {
    for (const status of TODOS_OS_STATUS) {
      if (ehEstadoFinal(status)) {
        expect(TRANSICOES_PERMITIDAS[status]).toHaveLength(0);
      }
    }
  });
});

describe('permiteAlteracao', () => {
  it.each([
    [StatusOrdemServico.ABERTA, true],
    [StatusOrdemServico.EM_ANDAMENTO, true],
    [StatusOrdemServico.CONCLUIDA, false],
    [StatusOrdemServico.CANCELADA, false],
  ])('%s -> %s', (status, esperado) => {
    expect(permiteAlteracao(status)).toBe(esperado);
  });

  it('nenhum estado final permite alteracao', () => {
    for (const status of TODOS_OS_STATUS) {
      if (ehEstadoFinal(status)) {
        expect(permiteAlteracao(status)).toBe(false);
      }
    }
  });
});

describe('permiteExclusao', () => {
  it.each([
    [StatusOrdemServico.ABERTA, true],
    [StatusOrdemServico.EM_ANDAMENTO, false],
    [StatusOrdemServico.CONCLUIDA, false],
    [StatusOrdemServico.CANCELADA, false],
  ])('%s -> %s', (status, esperado) => {
    expect(permiteExclusao(status)).toBe(esperado);
  });
});

describe('exigeMecanico', () => {
  it.each([
    [StatusOrdemServico.ABERTA, false],
    [StatusOrdemServico.EM_ANDAMENTO, true],
    [StatusOrdemServico.CONCLUIDA, true],
    [StatusOrdemServico.CANCELADA, false],
  ])('%s -> %s', (status, esperado) => {
    expect(exigeMecanico(status)).toBe(esperado);
  });
});
