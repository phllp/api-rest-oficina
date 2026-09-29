/** Conteudo do token JWT emitido pela API. */
export interface PayloadJwt {
  /** Id do usuario (claim padrao "subject"). */
  sub: number;
  email: string;
  /** Emitido em (segundos desde a epoca), preenchido pelo @nestjs/jwt. */
  iat?: number;
  /** Expira em (segundos desde a epoca), preenchido pelo @nestjs/jwt. */
  exp?: number;
}

/** Requisicao com o usuario autenticado, populado pelo JwtAuthGuard. */
export interface RequisicaoAutenticada {
  usuario?: PayloadJwt;
  headers: Record<string, string | string[] | undefined>;
}
