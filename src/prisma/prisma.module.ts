import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * Modulo global: o PrismaService fica disponivel para todos os modulos
 * da aplicacao sem precisar importar o PrismaModule em cada um deles.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
