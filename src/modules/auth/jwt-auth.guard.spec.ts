import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { RequisicaoAutenticada } from './tipos.js';

const PAYLOAD = { sub: 1, email: 'admin@oficina.com' };

/** Monta um ExecutionContext minimo com o header informado. */
function criarContexto(authorization?: string) {
  const requisicao = {
    headers: authorization === undefined ? {} : { authorization },
  } as RequisicaoAutenticada;

  const contexto = {
    switchToHttp: () => ({ getRequest: () => requisicao }),
    getHandler: () => () => undefined,
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;

  return { contexto, requisicao };
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwt: { verifyAsync: ReturnType<typeof vi.fn> };
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    jwt = { verifyAsync: vi.fn() };
    reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) };

    guard = new JwtAuthGuard(
      jwt as unknown as JwtService,
      reflector as unknown as Reflector,
    );
  });

  it('libera rota marcada com @Public() sem olhar o header', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const { contexto } = criarContexto();

    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('aceita token valido e coloca o payload na requisicao', async () => {
    jwt.verifyAsync.mockResolvedValue(PAYLOAD);
    const { contexto, requisicao } = criarContexto('Bearer token-valido');

    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('token-valido');
    expect(requisicao.usuario).toEqual(PAYLOAD);
  });

  it('recusa requisicao sem o header Authorization', async () => {
    const { contexto } = criarContexto();

    await expect(guard.canActivate(contexto)).rejects.toMatchObject({
      erro: 'NAO_AUTENTICADO',
      mensagem: 'Token de autenticação não informado.',
    });
  });

  it('recusa header vazio', async () => {
    const { contexto } = criarContexto('   ');

    await expect(guard.canActivate(contexto)).rejects.toMatchObject({
      erro: 'NAO_AUTENTICADO',
    });
  });

  it.each([
    ['token-sem-esquema'],
    ['Basic dXN1YXJpbzpzZW5oYQ=='],
    ['bearer token-minusculo'],
    ['Bearer'],
    ['Bearer token com partes demais'],
  ])('recusa o header %j por formato invalido', async (header) => {
    const { contexto } = criarContexto(header);

    await expect(guard.canActivate(contexto)).rejects.toMatchObject({
      erro: 'TOKEN_INVALIDO',
      mensagem:
        'Formato do token inválido. Use: Authorization: Bearer <token>.',
    });
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('recusa token com assinatura invalida', async () => {
    jwt.verifyAsync.mockRejectedValue(
      Object.assign(new Error('invalid signature'), {
        name: 'JsonWebTokenError',
      }),
    );
    const { contexto } = criarContexto('Bearer token-adulterado');

    await expect(guard.canActivate(contexto)).rejects.toMatchObject({
      erro: 'TOKEN_INVALIDO',
      mensagem: 'Token inválido.',
    });
  });

  it('distingue token expirado, com mensagem propria', async () => {
    jwt.verifyAsync.mockRejectedValue(
      Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' }),
    );
    const { contexto } = criarContexto('Bearer token-expirado');

    await expect(guard.canActivate(contexto)).rejects.toMatchObject({
      erro: 'TOKEN_INVALIDO',
      mensagem: 'Token expirado. Faça login novamente.',
    });
  });

  it('todas as recusas respondem com status 401', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('qualquer falha'));

    const cenarios = [undefined, 'formato errado', 'Bearer token-ruim'];

    for (const header of cenarios) {
      const { contexto } = criarContexto(header);
      const erro = await guard.canActivate(contexto).then(
        () => null,
        (excecao: unknown) => excecao as { getStatus: () => number },
      );

      expect(erro?.getStatus()).toBe(401);
    }
  });

  it('consulta o metadado de rota publica no metodo e na classe', async () => {
    jwt.verifyAsync.mockResolvedValue(PAYLOAD);
    const { contexto } = criarContexto('Bearer token-valido');

    await guard.canActivate(contexto);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      'rota_publica',
      expect.arrayContaining([expect.anything()]) as unknown[],
    );
  });
});
