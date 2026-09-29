import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErros } from '../../common/decorators/api-erros.decorator.js';
import { ApiRotaProtegida } from '../../common/decorators/api-rota-protegida.decorator.js';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe.js';
import { FiltroStatusQueryDto } from './dto/filtros-ordem-servico-query.dto.js';
import { OrdemServicoResumoDto } from './dto/ordem-servico-resposta.dto.js';
import {
  OrdensServicoService,
  type OrdemServicoResumo,
} from './ordens-servico.service.js';

/** Declarado no modulo de ordens de servico; tag do recurso pai no Swagger. */
@ApiTags('clientes')
@ApiRotaProtegida()
@Controller('clientes/:id/ordens-servico')
export class ClienteOrdensServicoController {
  constructor(private readonly ordensServicoService: OrdensServicoService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as ordens de servico de um cliente',
    description:
      'Reune as ordens de todos os veiculos do cliente. Array simples, sem paginacao, da mais recente para a mais antiga.',
  })
  @ApiParam({ name: 'id', example: 3, description: 'Id do cliente.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Ordens dos veiculos do cliente. Array vazio quando nao houver nenhuma.',
    type: [OrdemServicoResumoDto],
  })
  @ApiErros(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  listar(
    @Param('id', ParseIdPipe) id: number,
    @Query() filtro: FiltroStatusQueryDto,
  ): Promise<OrdemServicoResumo[]> {
    return this.ordensServicoService.listarPorCliente(id, filtro.status);
  }
}
