import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Test as RequisicaoSupertest } from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configurarApp } from '../src/configurar-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

/** Usuario criado no banco de teste para autenticar as chamadas. */
export const USUARIO_DE_TESTE = {
  nome: 'Usuario de Teste',
  email: 'teste@oficina.com',
  senha: 'senha-de-teste',
};

/**
 * Cliente HTTP com o token ja aplicado em todas as chamadas. Os testes usam
 * `api.get('/clientes')` em vez de repetir o header em cada requisicao.
 */
export interface ClienteHttpAutenticado {
  get: (url: string) => RequisicaoSupertest;
  post: (url: string) => RequisicaoSupertest;
  put: (url: string) => RequisicaoSupertest;
  patch: (url: string) => RequisicaoSupertest;
  delete: (url: string) => RequisicaoSupertest;
}

export interface AppDeTeste {
  app: INestApplication;
  prisma: PrismaService;
  jwtService: JwtService;
  /** Token valido do usuario de teste. */
  token: string;
  /** Cliente HTTP que envia o token automaticamente. */
  api: ClienteHttpAutenticado;
}

/**
 * Sobe a aplicacao real (AppModule + configurarApp) apontada para o banco de
 * teste, cria o usuario de teste e devolve um token valido.
 *
 * A DATABASE_URL e o JWT_SECRET vem do .env.test, carregado pelo
 * vitest.config.e2e.ts.
 */
export async function criarAppDeTeste(): Promise<AppDeTeste> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  configurarApp(app);
  await app.init();

  const prisma = app.get(PrismaService);
  const jwtService = app.get(JwtService);
  const token = await criarUsuarioDeTesteComToken(prisma, jwtService);

  return {
    app,
    prisma,
    jwtService,
    token,
    api: criarClienteAutenticado(app, token),
  };
}

/**
 * Garante o usuario de teste no banco e devolve um token JWT valido para ele.
 * O usuario e reaproveitado entre execucoes (upsert pelo e-mail).
 */
export async function criarUsuarioDeTesteComToken(
  prisma: PrismaService,
  jwtService: JwtService,
): Promise<string> {
  const senhaHash = await bcrypt.hash(USUARIO_DE_TESTE.senha, 10);

  const usuario = await prisma.usuario.upsert({
    where: { email: USUARIO_DE_TESTE.email },
    update: { senhaHash },
    create: {
      nome: USUARIO_DE_TESTE.nome,
      email: USUARIO_DE_TESTE.email,
      senhaHash,
    },
    select: { id: true, email: true },
  });

  return jwtService.sign({ sub: usuario.id, email: usuario.email });
}

/** Envolve o supertest aplicando o header Authorization em toda chamada. */
export function criarClienteAutenticado(
  app: INestApplication,
  token: string,
): ClienteHttpAutenticado {
  const autenticar = (requisicao: RequisicaoSupertest): RequisicaoSupertest =>
    requisicao.set('Authorization', `Bearer ${token}`);

  const servidor = () => request(app.getHttpServer() as App);

  return {
    get: (url) => autenticar(servidor().get(url)),
    post: (url) => autenticar(servidor().post(url)),
    put: (url) => autenticar(servidor().put(url)),
    patch: (url) => autenticar(servidor().patch(url)),
    delete: (url) => autenticar(servidor().delete(url)),
  };
}

/**
 * Apaga os dados de negocio respeitando a ordem das chaves estrangeiras.
 * Cada arquivo de teste chama isso antes e depois de rodar.
 *
 * A tabela `usuarios` fica de fora de proposito: o usuario de teste precisa
 * sobreviver para que o token continue valendo durante a suite.
 */
export async function limparDados(prisma: PrismaService): Promise<void> {
  await prisma.itemOrdemServico.deleteMany();
  await prisma.ordemServico.deleteMany();
  await prisma.veiculo.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.mecanico.deleteMany();
  await prisma.servico.deleteMany();
}
