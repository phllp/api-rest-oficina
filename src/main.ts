import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configurarApp } from './configurar-app.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  configurarApp(app);

  const configService = app.get(ConfigService);
  const porta = configService.get<number>('PORT', 3000);

  await app.listen(porta);

  Logger.log(`API disponivel em http://localhost:${porta}`, 'Bootstrap');
  Logger.log(
    `Documentacao Swagger em http://localhost:${porta}/docs`,
    'Bootstrap',
  );
}

await bootstrap();
