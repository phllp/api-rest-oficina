import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { configurarApp } from '../src/configurar-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

export interface AppDeTeste {
  app: INestApplication;
  prisma: PrismaService;
}

/**
 * Sobe a aplicacao real (AppModule + configurarApp) apontada para o banco de
 * teste. A DATABASE_URL vem do .env.test, carregado pelo vitest.config.e2e.ts.
 */
export async function criarAppDeTeste(): Promise<AppDeTeste> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  configurarApp(app);
  await app.init();

  return { app, prisma: app.get(PrismaService) };
}

/**
 * Apaga os dados de negocio respeitando a ordem das chaves estrangeiras.
 * Cada arquivo de teste chama isso antes e depois de rodar.
 */
export async function limparDados(prisma: PrismaService): Promise<void> {
  await prisma.itemOrdemServico.deleteMany();
  await prisma.ordemServico.deleteMany();
  await prisma.veiculo.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.mecanico.deleteMany();
  await prisma.servico.deleteMany();
}
