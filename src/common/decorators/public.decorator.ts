import { SetMetadata } from '@nestjs/common';

/** Chave usada pelo JwtAuthGuard para identificar rotas liberadas. */
export const CHAVE_ROTA_PUBLICA = 'rota_publica';

/**
 * Libera uma rota da autenticacao. Toda rota e protegida por padrao (o
 * JwtAuthGuard e global), entao este decorator e a excecao explicita:
 *
 * ```ts
 * @Public()
 * @Post('login')
 * ```
 */
export function Public(): MethodDecorator & ClassDecorator {
  return SetMetadata(CHAVE_ROTA_PUBLICA, true);
}
