import { Module } from '@nestjs/common';
import { ServicosController } from './servicos.controller.js';
import { ServicosService } from './servicos.service.js';

@Module({
  controllers: [ServicosController],
  providers: [ServicosService],
})
export class ServicosModule {}
