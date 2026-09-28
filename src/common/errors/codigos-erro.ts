/**
 * Codigos de erro estaveis da API.
 *
 * O codigo e a parte do erro que o consumidor da API pode tratar em codigo
 * (a `mensagem` e para quem esta desenvolvendo e pode mudar de redacao).
 */
export const CodigosErro = {
  DADOS_INVALIDOS: 'DADOS_INVALIDOS',
  JSON_INVALIDO: 'JSON_INVALIDO',
  NAO_AUTENTICADO: 'NAO_AUTENTICADO',
  TOKEN_INVALIDO: 'TOKEN_INVALIDO',
  RECURSO_NAO_ENCONTRADO: 'RECURSO_NAO_ENCONTRADO',
  ROTA_NAO_ENCONTRADA: 'ROTA_NAO_ENCONTRADA',
  REGISTRO_DUPLICADO: 'REGISTRO_DUPLICADO',
  RECURSO_EM_USO: 'RECURSO_EM_USO',
  OPERACAO_NAO_PERMITIDA: 'OPERACAO_NAO_PERMITIDA',
  ERRO_INTERNO: 'ERRO_INTERNO',
  /** Usado pelo GET /health quando o PostgreSQL nao responde. */
  BANCO_INDISPONIVEL: 'BANCO_INDISPONIVEL',
} as const;

export type CodigoErro = (typeof CodigosErro)[keyof typeof CodigosErro];

/**
 * Codigo de erro: aceita os codigos conhecidos (com autocomplete) e tambem
 * um texto livre, para codigos mais especificos de um recurso.
 */
export type CodigoErroOuTexto = CodigoErro | (string & {});

/** Status HTTP associado a cada codigo de erro. */
export const STATUS_POR_CODIGO: Record<CodigoErro, number> = {
  DADOS_INVALIDOS: 400,
  JSON_INVALIDO: 400,
  NAO_AUTENTICADO: 401,
  TOKEN_INVALIDO: 401,
  RECURSO_NAO_ENCONTRADO: 404,
  ROTA_NAO_ENCONTRADA: 404,
  REGISTRO_DUPLICADO: 409,
  RECURSO_EM_USO: 409,
  OPERACAO_NAO_PERMITIDA: 409,
  ERRO_INTERNO: 500,
  BANCO_INDISPONIVEL: 503,
};

/** Descricao usada na documentacao Swagger de cada codigo. */
export const DESCRICOES_ERRO: Record<CodigoErro, string> = {
  DADOS_INVALIDOS: 'Os dados enviados sao invalidos.',
  JSON_INVALIDO: 'O corpo da requisicao nao e um JSON valido.',
  NAO_AUTENTICADO: 'Autenticacao necessaria para acessar o recurso.',
  TOKEN_INVALIDO: 'O token informado e invalido ou expirou.',
  RECURSO_NAO_ENCONTRADO: 'O recurso informado nao existe.',
  ROTA_NAO_ENCONTRADA: 'A rota solicitada nao existe.',
  REGISTRO_DUPLICADO: 'Ja existe um registro com os dados informados.',
  RECURSO_EM_USO: 'O registro possui vinculos e nao pode ser removido.',
  OPERACAO_NAO_PERMITIDA:
    'A operacao nao e permitida no estado atual do recurso.',
  ERRO_INTERNO: 'Ocorreu um erro interno no servidor.',
  BANCO_INDISPONIVEL: 'O banco de dados esta indisponivel.',
};

/**
 * Codigo padrao para cada status HTTP, usado para traduzir excecoes genericas
 * do Nest e para montar a documentacao do decorator ApiErros.
 */
export const CODIGO_POR_STATUS: Record<number, CodigoErro> = {
  400: CodigosErro.DADOS_INVALIDOS,
  401: CodigosErro.NAO_AUTENTICADO,
  403: CodigosErro.OPERACAO_NAO_PERMITIDA,
  404: CodigosErro.RECURSO_NAO_ENCONTRADO,
  409: CodigosErro.REGISTRO_DUPLICADO,
  500: CodigosErro.ERRO_INTERNO,
  503: CodigosErro.BANCO_INDISPONIVEL,
};
