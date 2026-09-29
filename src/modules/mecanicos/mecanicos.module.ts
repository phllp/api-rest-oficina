import { Module } from '@nestjs/common';
import { MecanicosController } from './mecanicos.controller.js';
import { MecanicosService } from './mecanicos.service.js';

@Module({
  controllers: [MecanicosController],
  providers: [MecanicosService],
})
export class MecanicosModule {}
