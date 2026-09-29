import {
  HttpStatus,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { CHAVE_ROTA_PUBLICA } from '../../common/decorators/public.decorator.js';
import { ApiException } from '../../common/errors/api.exception.js';
import { CodigosErro } from '../../common/errors/codigos-erro.js';
import type { PayloadJwt, RequisicaoAutenticada } from './tipos.js';

/** Nome que o jsonwebtoken da ao erro de token expirado. */
const ERRO_TOKEN_EXPIRADO = 'TokenExpiredError';

/**
 * Guard global: toda rota exige `Authorization: Bearer <token>`, exceto as
 * marcadas com @Public(). Em caso de sucesso, o payload do token e colocado
 * em `request.usuario` (lido pelo @UsuarioAtual()).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    if (this.ehRotaPublica(contexto)) {
      return true;
    }

    const requisicao = contexto
      .switchToHttp()
      .getRequest<RequisicaoAutenticada>();

    const token = this.extrairToken(requisicao);

    try {
      requisicao.usuario = await this.jwtService.verifyAsync<PayloadJwt>(token);
    } catch (erro) {
      throw this.erroDeToken(
        erro instanceof Error && erro.name === ERRO_TOKEN_EXPIRADO
          ? 'Token expirado. Faça login novamente.'
          : 'Token inválido.',
      );
    }

    return true;
  }

  /** @Public() no metodo tem prioridade sobre o controller. */
  private ehRotaPublica(contexto: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(CHAVE_ROTA_PUBLICA, [
        contexto.getHandler(),
        contexto.getClass(),
      ]) ?? false
    );
  }

  /** Le o header Authorization exigindo o formato `Bearer <token>`. */
  private extrairToken(requisicao: RequisicaoAutenticada): string {
    const header = requisicao.headers.authorization;

    if (typeof header !== 'string' || header.trim().length === 0) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        CodigosErro.NAO_AUTENTICADO,
        'Token de autenticação não informado.',
      );
    }

    const [esquema, token, ...resto] = header.trim().split(/\s+/);

    if (esquema !== 'Bearer' || !token || resto.length > 0) {
      throw this.erroDeToken(
        'Formato do token inválido. Use: Authorization: Bearer <token>.',
      );
    }

    return token;
  }

  private erroDeToken(mensagem: string): ApiException {
    return new ApiException(
      HttpStatus.UNAUTHORIZED,
      CodigosErro.TOKEN_INVALIDO,
      mensagem,
    );
  }
}
