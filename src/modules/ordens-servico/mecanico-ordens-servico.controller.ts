import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErros } from '../../common/decorators/api-erros.decorator.js';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe.js';
import { FiltroStatusQueryDto } from './dto/filtros-ordem-servico-query.dto.js';
import { OrdemServicoResumoDto } from './dto/ordem-servico-resposta.dto.js';
import {
  OrdensServicoService,
  type OrdemServicoResumo,
} from './ordens-servico.service.js';

/** Declarado no modulo de ordens de servico; tag do recurso pai no Swagger. */
@ApiTags('mecanicos')
@Controller('mecanicos/:id/ordens-servico')
export class MecanicoOrdensServicoController {
  constructor(private readonly ordensServicoService: OrdensServicoService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as ordens de servico de um mecanico',
    description:
      'Relacionamento Mecanico 1:N OrdemServico. Array simples, sem paginacao, da mais recente para a mais antiga.',
  })
  @ApiParam({ name: 'id', example: 2, description: 'Id do mecanico.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Ordens atribuidas ao mecanico. Array vazio quando ele nao tem nenhuma.',
    type: [OrdemServicoResumoDto],
  })
  @ApiErros(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  listar(
    @Param('id', ParseIdPipe) id: number,
    @Query() filtro: FiltroStatusQueryDto,
  ): Promise<OrdemServicoResumo[]> {
    return this.ordensServicoService.listarPorMecanico(id, filtro.status);
  }
}
