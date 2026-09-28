import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Validacao automatica dos DTOs em todas as rotas.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Garante que o onModuleDestroy do PrismaService rode ao encerrar o processo.
  app.enableShutdownHooks();

  const configuracaoSwagger = new DocumentBuilder()
    .setTitle('API Oficina Mecânica')
    .setDescription(
      'API REST para gestao de clientes, veiculos, mecanicos, servicos e ordens de servico de uma oficina mecanica.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documento = SwaggerModule.createDocument(app, configuracaoSwagger);
  SwaggerModule.setup('docs', app, documento);

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
