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
      [
        'API REST para gestao de clientes, veiculos, mecanicos, servicos e ordens de servico de uma oficina mecanica.',
        '',
        '## Autenticacao',
        '',
        'Todos os endpoints exigem um token JWT, exceto `POST /auth/login` e `GET /health`.',
        '',
        '1. Chame **POST /auth/login** com `{ "email": "admin@oficina.com", "senha": "123456" }`.',
        '2. Copie o valor de `token` da resposta.',
        '3. Clique em **Authorize** (no topo desta pagina), cole o token e confirme.',
        '',
        'A partir dai o cadeado dos endpoints fica fechado e as chamadas levam o header',
        '`Authorization: Bearer <token>` automaticamente. O token vale 1 hora por padrao.',
        'Detalhes em `docs/autenticacao.md`.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('health', 'Verificacao de disponibilidade da API e do banco')
    .addTag('clientes', 'Cadastro de clientes e seus veiculos')
    .addTag('veiculos', 'Cadastro de veiculos e vinculo com o proprietario')
    .addTag('mecanicos', 'Cadastro dos mecanicos que executam as ordens')
    .addTag('servicos', 'Catalogo de servicos oferecidos pela oficina')
    .addTag(
      'ordens-servico',
      'Ordens de servico: itens, calculo de valores e ciclo de vida',
    )
    .addTag('auth', 'Autenticacao: login e identificacao do usuario')
    .build();

  const documento = SwaggerModule.createDocument(app, configuracaoSwagger);
  SwaggerModule.setup('docs', app, documento, {
    // Mantem o token informado no botao Authorize apos recarregar a pagina.
    swaggerOptions: { persistAuthorization: true },
  });
}
