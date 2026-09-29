import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { ApiException } from '../../common/errors/api.exception.js';
import { CodigosErro } from '../../common/errors/codigos-erro.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { LoginRespostaDto } from './dto/login-resposta.dto.js';
import type { UsuarioRespostaDto } from './dto/usuario-resposta.dto.js';
import type { PayloadJwt } from './tipos.js';

/** Campos do usuario devolvidos pela API. Nunca inclui senhaHash. */
const SELECT_USUARIO = {
  id: true,
  nome: true,
  email: true,
} as const;

/**
 * Hash de uma senha aleatoria, usado quando o e-mail nao existe.
 *
 * Comparar contra ele custa o mesmo que comparar contra o hash de um usuario
 * real, entao o tempo de resposta nao revela se o e-mail esta cadastrado
 * (evita enumeracao de usuarios por cronometragem).
 */
const HASH_DE_COMPARACAO =
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Autentica o usuario e emite o token.
   *
   * E-mail inexistente e senha errada produzem **exatamente** a mesma
   * resposta: dizer qual dos dois falhou entregaria a lista de e-mails
   * cadastrados a quem esta tentando adivinhar.
   */
  async login(dto: LoginDto): Promise<LoginRespostaDto> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      select: { ...SELECT_USUARIO, senhaHash: true },
    });

    const senhaConfere = await bcrypt.compare(
      dto.senha,
      usuario?.senhaHash ?? HASH_DE_COMPARACAO,
    );

    if (!usuario || !senhaConfere) {
      throw this.credenciaisInvalidas();
    }

    return this.emitirToken({ sub: usuario.id, email: usuario.email });
  }

  /** Recarrega do banco o usuario dono do token. */
  async buscarPerfil(payload: PayloadJwt): Promise<UsuarioRespostaDto> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: SELECT_USUARIO,
    });

    if (!usuario) {
      // O token e valido, mas o usuario foi removido depois da emissao.
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        CodigosErro.TOKEN_INVALIDO,
        'O usuário deste token não existe mais. Faça login novamente.',
      );
    }

    return usuario;
  }

  /**
   * Assina o token e deriva `expiraEm` das claims `iat`/`exp` do proprio
   * token -- assim o valor em segundos nunca discorda da validade real,
   * qualquer que seja o formato configurado em JWT_EXPIRES_IN.
   */
  private emitirToken(payload: PayloadJwt): LoginRespostaDto {
    const token = this.jwtService.sign(payload);
    const { iat, exp } = this.jwtService.decode<PayloadJwt>(token);

    return {
      token,
      tipo: 'Bearer',
      expiraEm: exp !== undefined && iat !== undefined ? exp - iat : 0,
    };
  }

  private credenciaisInvalidas(): ApiException {
    return new ApiException(
      HttpStatus.UNAUTHORIZED,
      CodigosErro.CREDENCIAIS_INVALIDAS,
      'E-mail ou senha inválidos.',
    );
  }
}
