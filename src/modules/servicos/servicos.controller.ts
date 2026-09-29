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
import { AtualizarServicoDto } from './dto/atualizar-servico.dto.js';
import { CriarServicoDto } from './dto/criar-servico.dto.js';
import { FiltrosServicoQueryDto } from './dto/filtros-servico-query.dto.js';
import { ServicoRespostaDto } from './dto/servico-resposta.dto.js';
import { ServicosService, type ServicoDoPrisma } from './servicos.service.js';

@ApiTags('servicos')
@ApiRotaProtegida()
@Controller('servicos')
export class ServicosController {
  constructor(private readonly servicosService: ServicosService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista o catalogo de servicos',
    description:
      'Listagem paginada com filtros por descricao, faixa de preco e situacao, e ordenacao configuravel.',
  })
  @ApiPaginatedResponse(ServicoRespostaDto, 'Lista paginada de servicos.')
  @ApiErros(HttpStatus.BAD_REQUEST)
  listar(
    @Query() filtros: FiltrosServicoQueryDto,
  ): Promise<RespostaPaginada<ServicoDoPrisma>> {
    return this.servicosService.listar(filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um servico pelo id' })
  @ApiParam({ name: 'id', example: 1, description: 'Id do servico.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Servico encontrado.',
    type: ServicoRespostaDto,
  })
  @ApiErros(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  buscarPorId(@Param('id', ParseIdPipe) id: number): Promise<ServicoDoPrisma> {
    return this.servicosService.buscarPorId(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cadastra um servico no catalogo',
    description: 'O campo ativo e opcional e assume true quando omitido.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Servico cadastrado.',
    type: ServicoRespostaDto,
  })
  @ApiErros(HttpStatus.BAD_REQUEST, CodigosErro.REGISTRO_DUPLICADO)
  criar(@Body() dto: CriarServicoDto): Promise<ServicoDoPrisma> {
    return this.servicosService.criar(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Substitui os dados de um servico',
    description:
      'Substituicao completa: todos os campos sao obrigatorios, inclusive ativo. Alterar o preco nao afeta ordens de servico existentes, pois cada item guarda o precoUnitario da epoca.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Id do servico.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Servico atualizado.',
    type: ServicoRespostaDto,
  })
  @ApiErros(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    CodigosErro.REGISTRO_DUPLICADO,
  )
  atualizar(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: AtualizarServicoDto,
  ): Promise<ServicoDoPrisma> {
    return this.servicosService.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclui um servico do catalogo',
    description:
      'Só é permitido excluir servicos que nunca foram lancados em uma ordem. Para retirar do catalogo um servico com historico, altere ativo para false.',
  })
  @ApiParam({ name: 'id', example: 10, description: 'Id do servico.' })
  @ApiNoContentResponse({ description: 'Servico excluido.' })
  @ApiErros(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    CodigosErro.RECURSO_EM_USO,
  )
  remover(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.servicosService.remover(id);
  }
}
