import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErros } from '../../common/decorators/api-erros.decorator.js';
import { ApiRotaProtegida } from '../../common/decorators/api-rota-protegida.decorator.js';
import { CodigosErro } from '../../common/errors/codigos-erro.js';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator.js';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe.js';
import type { RespostaPaginada } from '../../common/utils/paginacao.js';
import { AtualizarVeiculoDto } from './dto/atualizar-veiculo.dto.js';
import { CriarVeiculoDto } from './dto/criar-veiculo.dto.js';
import { FiltrosVeiculoQueryDto } from './dto/filtros-veiculo-query.dto.js';
import {
  VeiculoDetalheRespostaDto,
  VeiculoRespostaDto,
} from './dto/veiculo-resposta.dto.js';
import { VeiculosService } from './veiculos.service.js';

@ApiTags('veiculos')
@ApiRotaProtegida()
@Controller('veiculos')
export class VeiculosController {
  constructor(private readonly veiculosService: VeiculosService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os veiculos cadastrados',
    description:
      'Listagem paginada e ordenada por placa, com filtros opcionais por placa, marca, modelo, ano e cliente.',
  })
  @ApiPaginatedResponse(VeiculoRespostaDto, 'Lista paginada de veiculos.')
  @ApiErros(HttpStatus.BAD_REQUEST)
  listar(
    @Query() filtros: FiltrosVeiculoQueryDto,
  ): Promise<RespostaPaginada<VeiculoRespostaDto>> {
    return this.veiculosService.listar(filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um veiculo pelo id' })
  @ApiParam({ name: 'id', example: 1, description: 'Id do veiculo.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Veiculo encontrado, com o cliente resumido.',
    type: VeiculoDetalheRespostaDto,
  })
  @ApiErros(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  buscarPorId(
    @Param('id', ParseIdPipe) id: number,
  ): Promise<VeiculoDetalheRespostaDto> {
    return this.veiculosService.buscarPorId(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastra um veiculo' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Veiculo cadastrado.',
    type: VeiculoRespostaDto,
  })
  @ApiErros(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    CodigosErro.REGISTRO_DUPLICADO,
  )
  criar(@Body() dto: CriarVeiculoDto): Promise<VeiculoRespostaDto> {
    return this.veiculosService.criar(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Substitui os dados de um veiculo',
    description:
      'Substituicao completa: todos os campos sao obrigatorios. Trocar o clienteId transfere o veiculo para outro proprietario.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Id do veiculo.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Veiculo atualizado.',
    type: VeiculoRespostaDto,
  })
  @ApiErros(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    CodigosErro.REGISTRO_DUPLICADO,
  )
  atualizar(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: AtualizarVeiculoDto,
  ): Promise<VeiculoRespostaDto> {
    return this.veiculosService.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclui um veiculo',
    description:
      'Só é permitido excluir veiculos sem ordens de servico vinculadas (FK com Restrict).',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Id do veiculo.' })
  @ApiNoContentResponse({ description: 'Veiculo excluido.' })
  @ApiErros(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    CodigosErro.RECURSO_EM_USO,
  )
  remover(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.veiculosService.remover(id);
  }
}
