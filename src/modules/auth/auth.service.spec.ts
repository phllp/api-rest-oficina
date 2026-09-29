import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { ApiException } from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

const AGORA_EM_SEGUNDOS = 1_790_000_000;

function criarPrismaMock() {
  return { usuario: { findUnique: vi.fn() } };
}

function criarJwtMock() {
  return {
    sign: vi.fn().mockReturnValue('token-assinado'),
    decode: vi.fn().mockReturnValue({
      sub: 1,
      email: 'admin@oficina.com',
      iat: AGORA_EM_SEGUNDOS,
      exp: AGORA_EM_SEGUNDOS + 3600,
    }),
  };
}

const USUARIO = {
  id: 1,
  nome: 'Administrador da Oficina',
  email: 'admin@oficina.com',
  senhaHash: '$2b$10$hashvalido',
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof criarPrismaMock>;
  let jwt: ReturnType<typeof criarJwtMock>;

  beforeEach(async () => {
    prisma = criarPrismaMock();
    jwt = criarJwtMock();

    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = modulo.get(AuthService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('devolve token, tipo e expiraEm derivado do proprio token', async () => {
      prisma.usuario.findUnique.mockResolvedValue(USUARIO);
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const resposta = await service.login({
        email: 'admin@oficina.com',
        senha: '123456',
      });

      expect(resposta).toEqual({
        token: 'token-assinado',
        tipo: 'Bearer',
        expiraEm: 3600,
      });
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 1,
        email: 'admin@oficina.com',
      });
    });

    it('nao inclui senhaHash no payload do token', async () => {
      prisma.usuario.findUnique.mockResolvedValue(USUARIO);
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await service.login({ email: 'admin@oficina.com', senha: '123456' });

      expect(JSON.stringify(jwt.sign.mock.calls[0])).not.toContain('senhaHash');
      expect(JSON.stringify(jwt.sign.mock.calls[0])).not.toContain(
        'hashvalido',
      );
    });

    it('devolve expiraEm zero quando o token nao traz iat/exp', async () => {
      prisma.usuario.findUnique.mockResolvedValue(USUARIO);
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwt.decode.mockReturnValue({ sub: 1, email: 'admin@oficina.com' });

      const resposta = await service.login({
        email: 'admin@oficina.com',
        senha: '123456',
      });

      expect(resposta.expiraEm).toBe(0);
    });

    it('lanca 401 CREDENCIAIS_INVALIDAS quando a senha esta errada', async () => {
      prisma.usuario.findUnique.mockResolvedValue(USUARIO);
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'admin@oficina.com', senha: 'errada' }),
      ).rejects.toMatchObject({
        erro: 'CREDENCIAIS_INVALIDAS',
        mensagem: 'E-mail ou senha inválidos.',
      });
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('lanca o mesmo erro quando o e-mail nao existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'ninguem@oficina.com', senha: '123456' }),
      ).rejects.toMatchObject({
        erro: 'CREDENCIAIS_INVALIDAS',
        mensagem: 'E-mail ou senha inválidos.',
      });
    });

    it('usa exatamente a mesma resposta nos dois casos de falha', async () => {
      const comparar = vi.spyOn(bcrypt, 'compare');

      prisma.usuario.findUnique.mockResolvedValue(USUARIO);
      comparar.mockResolvedValue(false as never);
      const erroSenha = await service
        .login({ email: 'admin@oficina.com', senha: 'errada' })
        .then(
          () => null,
          (erro: unknown) => erro as ApiException,
        );

      prisma.usuario.findUnique.mockResolvedValue(null);
      const erroEmail = await service
        .login({ email: 'ninguem@oficina.com', senha: '123456' })
        .then(
          () => null,
          (erro: unknown) => erro as ApiException,
        );

      expect(erroSenha?.getStatus()).toBe(erroEmail?.getStatus());
      expect(erroSenha?.erro).toBe(erroEmail?.erro);
      expect(erroSenha?.mensagem).toBe(erroEmail?.mensagem);
    });

    it('compara a senha mesmo sem usuario, para nao vazar a existencia do e-mail', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      const comparar = vi
        .spyOn(bcrypt, 'compare')
        .mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'ninguem@oficina.com', senha: '123456' }),
      ).rejects.toBeInstanceOf(ApiException);

      // o trabalho de hashing acontece nos dois caminhos
      expect(comparar).toHaveBeenCalledTimes(1);
      const [senhaEnviada, hashUsado] = comparar.mock.calls[0];
      expect(senhaEnviada).toBe('123456');
      expect(String(hashUsado)).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('buscarPerfil', () => {
    it('devolve id, nome e email sem senhaHash', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 1,
        nome: 'Administrador da Oficina',
        email: 'admin@oficina.com',
      });

      const perfil = await service.buscarPerfil({
        sub: 1,
        email: 'admin@oficina.com',
      });

      expect(perfil).toEqual({
        id: 1,
        nome: 'Administrador da Oficina',
        email: 'admin@oficina.com',
      });
      expect(perfil).not.toHaveProperty('senhaHash');
      expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, nome: true, email: true },
      });
    });

    it('lanca 401 TOKEN_INVALIDO quando o usuario do token nao existe mais', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.buscarPerfil({ sub: 99, email: 'removido@oficina.com' }),
      ).rejects.toMatchObject({
        erro: 'TOKEN_INVALIDO',
        mensagem:
          'O usuário deste token não existe mais. Faça login novamente.',
      });
    });
  });
});
