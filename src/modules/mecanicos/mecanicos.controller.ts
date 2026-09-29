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
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator.js';
import { CodigosErro } from '../../common/errors/codigos-erro.js';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe.js';
import type { RespostaPaginada } from '../../common/utils/paginacao.js';
import { AtualizarMecanicoDto } from './dto/atualizar-mecanico.dto.js';
import { CriarMecanicoDto } from './dto/criar-mecanico.dto.js';
import { FiltrosMecanicoQueryDto } from './dto/filtros-mecanico-query.dto.js';
import {
  MecanicoDetalheRespostaDto,
  MecanicoRespostaDto,
} from './dto/mecanico-resposta.dto.js';
import { MecanicosService } from './mecanicos.service.js';

@ApiTags('mecanicos')
@ApiRotaProtegida()
@Controller('mecanicos')
export class MecanicosController {
  constructor(private readonly mecanicosService: MecanicosService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os mecanicos cadastrados',
    description:
      'Listagem paginada e ordenada por nome, com filtros opcionais por nome, especialidade e situacao.',
  })
  @ApiPaginatedResponse(MecanicoRespostaDto, 'Lista paginada de mecanicos.')
  @ApiErros(HttpStatus.BAD_REQUEST)
  listar(
    @Query() filtros: FiltrosMecanicoQueryDto,
  ): Promise<RespostaPaginada<MecanicoRespostaDto>> {
    return this.mecanicosService.listar(filtros);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Busca um mecanico pelo id',
    description:
      'Inclui o total de ordens de servico vinculadas, util para saber se o mecanico pode ser excluido.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Id do mecanico.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mecanico encontrado.',
    type: MecanicoDetalheRespostaDto,
  })
  @ApiErros(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  buscarPorId(
    @Param('id', ParseIdPipe) id: number,
  ): Promise<MecanicoDetalheRespostaDto> {
    return this.mecanicosService.buscarPorId(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cadastra um mecanico',
    description: 'O campo ativo e opcional e assume true quando omitido.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Mecanico cadastrado.',
    type: MecanicoRespostaDto,
  })
  @ApiErros(HttpStatus.BAD_REQUEST)
  criar(@Body() dto: CriarMecanicoDto): Promise<MecanicoRespostaDto> {
    return this.mecanicosService.criar(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Substitui os dados de um mecanico',
    description:
      'Substituicao completa: todos os campos sao obrigatorios, inclusive ativo.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Id do mecanico.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mecanico atualizado.',
    type: MecanicoRespostaDto,
  })
  @ApiErros(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  atualizar(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: AtualizarMecanicoDto,
  ): Promise<MecanicoRespostaDto> {
    return this.mecanicosService.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclui um mecanico',
    description:
      'Só é permitido excluir mecanicos sem ordens de servico. Para tirar de circulacao um mecanico com historico, altere ativo para false.',
  })
  @ApiParam({ name: 'id', example: 5, description: 'Id do mecanico.' })
  @ApiNoContentResponse({ description: 'Mecanico excluido.' })
  @ApiErros(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    CodigosErro.RECURSO_EM_USO,
  )
  remover(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.mecanicosService.remover(id);
  }
}
