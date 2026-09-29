/**
 * Conversao de datas de filtro (`YYYY-MM-DD`) para os instantes usados nas
 * consultas.
 *
 * Tudo e interpretado em **UTC**: `data_inicio=2026-03-01` vira
 * `2026-03-01T00:00:00.000Z` e `data_fim=2026-03-31` vira
 * `2026-03-31T23:59:59.999Z`, de modo que os dois extremos sao inclusivos e o
 * resultado nao muda conforme o fuso do servidor.
 */

/** Primeiro instante do dia informado, em UTC. */
export function inicioDoDiaUtc(data: string): Date {
  return new Date(`${data}T00:00:00.000Z`);
}

/** Ultimo instante do dia informado, em UTC. */
export function fimDoDiaUtc(data: string): Date {
  return new Date(`${data}T23:59:59.999Z`);
}
