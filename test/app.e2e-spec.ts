import { type INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import {
  criarAppDeTeste,
  type ClienteHttpAutenticado,
} from './util-app-teste.js';

// Teste de ponta a ponta: exige o PostgreSQL no ar (npm run db:up).
describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;
  let api: ClienteHttpAutenticado;

  beforeAll(async () => {
    const criado = await criarAppDeTeste();
    app = criado.app as INestApplication<App>;
    api = criado.api;
  });

  it('/health (GET) responde 200 com o banco disponivel', () => {
    return api
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  afterAll(async () => {
    await app.close();
  });
});
