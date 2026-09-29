import { StatusOrdemServico } from '@prisma/client';

/**
 * Maquina de estados da ordem de servico -- ponto unico de verdade sobre o
 * que pode virar o que. Funcoes puras, sem Nest e sem Prisma alem do enum,
 * para serem testadas isoladamente.
 *
 *   ABERTA       -> EM_ANDAMENTO | CANCELADA
 *   EM_ANDAMENTO -> CONCLUIDA    | CANCELADA
 *   CONCLUIDA    -> (final)
 *   CANCELADA    -> (final)
 */
export const TRANSICOES_PERMITIDAS: Record<
  StatusOrdemServico,
  readonly StatusOrdemServico[]
> = {
  ABERTA: [StatusOrdemServico.EM_ANDAMENTO, StatusOrdemServico.CANCELADA],
  EM_ANDAMENTO: [StatusOrdemServico.CONCLUIDA, StatusOrdemServico.CANCELADA],
  CONCLUIDA: [],
  CANCELADA: [],
};

/** Status que exigem um mecanico atribuido a ordem. */
export const STATUS_QUE_EXIGEM_MECANICO: readonly StatusOrdemServico[] = [
  StatusOrdemServico.EM_ANDAMENTO,
  StatusOrdemServico.CONCLUIDA,
];

/** Status que permitem alterar os dados e os itens da ordem. */
export const STATUS_QUE_PERMITEM_ALTERACAO: readonly StatusOrdemServico[] = [
  StatusOrdemServico.ABERTA,
  StatusOrdemServico.EM_ANDAMENTO,
];

/** Estado final nao aceita nenhuma transicao nem alteracao. */
export function ehEstadoFinal(status: StatusOrdemServico): boolean {
  return TRANSICOES_PERMITIDAS[status].length === 0;
}

/** A ordem pode ter dados e itens alterados neste status? */
export function permiteAlteracao(status: StatusOrdemServico): boolean {
  return STATUS_QUE_PERMITEM_ALTERACAO.includes(status);
}

/** A ordem so pode ser excluida enquanto estiver aberta. */
export function permiteExclusao(status: StatusOrdemServico): boolean {
  return status === StatusOrdemServico.ABERTA;
}

/** Este status exige que a ordem tenha um mecanico atribuido? */
export function exigeMecanico(status: StatusOrdemServico): boolean {
  return STATUS_QUE_EXIGEM_MECANICO.includes(status);
}

/** A transicao de um status para outro e permitida? */
export function ehTransicaoPermitida(
  de: StatusOrdemServico,
  para: StatusOrdemServico,
): boolean {
  return TRANSICOES_PERMITIDAS[de].includes(para);
}
