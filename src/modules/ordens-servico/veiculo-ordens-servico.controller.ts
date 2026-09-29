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

/**
 * Vive no modulo de ordens de servico (e nao no de veiculos) para nao criar
 * dependencia circular entre os modulos, mas aparece no Swagger sob a tag do
 * recurso pai.
 */
@ApiTags('veiculos')
@ApiRotaProtegida()
@Controller('veiculos/:id/ordens-servico')
export class VeiculoOrdensServicoController {
  constructor(private readonly ordensServicoService: OrdensServicoService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista o historico de ordens de servico de um veiculo',
    description:
      'Relacionamento Veiculo 1:N OrdemServico. Array simples, sem paginacao, da mais recente para a mais antiga.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Id do veiculo.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Ordens de servico do veiculo. Array vazio quando ele nunca passou pela oficina.',
    type: [OrdemServicoResumoDto],
  })
  @ApiErros(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  listar(
    @Param('id', ParseIdPipe) id: number,
    @Query() filtro: FiltroStatusQueryDto,
  ): Promise<OrdemServicoResumo[]> {
    return this.ordensServicoService.listarPorVeiculo(id, filtro.status);
  }
}
