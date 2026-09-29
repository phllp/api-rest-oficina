import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { ClientesModule } from './modules/clientes/clientes.module.js';
import { MecanicosModule } from './modules/mecanicos/mecanicos.module.js';
import { OrdensServicoModule } from './modules/ordens-servico/ordens-servico.module.js';
import { ServicosModule } from './modules/servicos/servicos.module.js';
import { VeiculosModule } from './modules/veiculos/veiculos.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: '.env',
      validate,
    }),
    PrismaModule,
    HealthModule,
    ClientesModule,
    VeiculosModule,
    MecanicosModule,
    ServicosModule,
    OrdensServicoModule,
  ],
})
export class AppModule {}
