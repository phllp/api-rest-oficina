/** Parametros de entrada da paginacao. */
export interface ParametrosPaginacao {
  page: number;
  limit: number;
}

/** Envelope padrao das listagens paginadas da API. */
export interface RespostaPaginada<T> {
  page: number;
  limit: number;
  total: number;
  data: T[];
}

/**
 * Converte page/limit nos parametros `skip` e `take` do Prisma.
 * Valores fora da faixa sao normalizados para que a consulta nunca quebre.
 */
export function calcularPaginacao({ page, limit }: ParametrosPaginacao): {
  skip: number;
  take: number;
} {
  const paginaAtual = Number.isFinite(page) && page >= 1 ? Math.trunc(page) : 1;
  const porPagina =
    Number.isFinite(limit) && limit >= 1 ? Math.trunc(limit) : 10;

  return { skip: (paginaAtual - 1) * porPagina, take: porPagina };
}

/**
 * Monta a resposta paginada. Uma pagina depois do fim da lista devolve
 * `data` vazio com status 200 -- nao e um erro.
 */
export function montarRespostaPaginada<T>(
  data: T[],
  total: number,
  { page, limit }: ParametrosPaginacao,
): RespostaPaginada<T> {
  return { page, limit, total, data };
}
