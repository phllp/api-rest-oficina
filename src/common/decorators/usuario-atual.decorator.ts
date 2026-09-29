import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type {
  PayloadJwt,
  RequisicaoAutenticada,
} from '../../modules/auth/tipos.js';

/**
 * Entrega o payload do token do usuario autenticado ao controller:
 *
 * ```ts
 * @Get('me')
 * buscarPerfil(@UsuarioAtual() usuario: PayloadJwt) { ... }
 * ```
 *
 * O payload e colocado na requisicao pelo JwtAuthGuard; em rotas publicas o
 * valor e `undefined`.
 */
export const UsuarioAtual = createParamDecorator(
  (_dados: unknown, contexto: ExecutionContext): PayloadJwt | undefined => {
    const requisicao = contexto
      .switchToHttp()
      .getRequest<RequisicaoAutenticada>();

    return requisicao.usuario;
  },
);
