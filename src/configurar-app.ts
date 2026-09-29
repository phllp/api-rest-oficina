import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { ValidationError } from 'class-validator';
import { DecimalInterceptor } from './common/interceptors/decimal.interceptor.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { achatarErrosValidacao } from './common/errors/achatar-erros-validacao.js';
import { DadosInvalidosException } from './common/errors/api.exception.js';

export function configurarApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Erros de validacao saem no padrao da API, com os detalhes por campo.
      exceptionFactory: (erros: ValidationError[]) =>
        new DadosInvalidosException(
          'Os dados enviados são inválidos.',
          achatarErrosValidacao(erros),
        ),
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new DecimalInterceptor());

  // Garante que o onModuleDestroy do PrismaService rode ao encerrar o processo.
  app.enableShutdownHooks();

  const configuracaoSwagger = new DocumentBuilder()
    .setTitle('API Oficina Mecânica')
    .setDescription(
      'API REST para gestao de clientes, veiculos, mecanicos, servicos e ordens de servico de uma oficina mecanica.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('health', 'Verificacao de disponibilidade da API e do banco')
    .addTag('clientes', 'Cadastro de clientes e seus veiculos')
    .addTag('veiculos', 'Cadastro de veiculos e vinculo com o proprietario')
    .addTag('mecanicos', 'Cadastro dos mecanicos que executam as ordens')
    .addTag('servicos', 'Catalogo de servicos oferecidos pela oficina')
    .build();

  const documento = SwaggerModule.createDocument(app, configuracaoSwagger);
  SwaggerModule.setup('docs', app, documento);
}
