import { Module } from '@nestjs/common';
import { ClienteOrdensServicoController } from './cliente-ordens-servico.controller.js';
import { MecanicoOrdensServicoController } from './mecanico-ordens-servico.controller.js';
import { OrdensServicoController } from './ordens-servico.controller.js';
import { OrdensServicoService } from './ordens-servico.service.js';
import { VeiculoOrdensServicoController } from './veiculo-ordens-servico.controller.js';

@Module({
  controllers: [
    OrdensServicoController,
    VeiculoOrdensServicoController,
    MecanicoOrdensServicoController,
    ClienteOrdensServicoController,
  ],
  providers: [OrdensServicoService],
})
export class OrdensServicoModule {}
