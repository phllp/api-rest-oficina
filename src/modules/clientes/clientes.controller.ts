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
import { ClientesService } from './clientes.service.js';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto.js';
import {
  ClienteDetalheRespostaDto,
  ClienteRespostaDto,
  VeiculoDoClienteDto,
} from './dto/cliente-resposta.dto.js';
import { CriarClienteDto } from './dto/criar-cliente.dto.js';
import { FiltrosClienteQueryDto } from './dto/filtros-cliente-query.dto.js';

@ApiTags('clientes')
@ApiRotaProtegida()
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os clientes cadastrados',
    description:
      'Listagem paginada e ordenada por nome, com filtros opcionais por nome, CPF e e-mail.',
  })
  @ApiPaginatedResponse(ClienteRespostaDto, 'Lista paginada de clientes.')
  @ApiErros(HttpStatus.BAD_REQUEST)
  listar(
    @Query() filtros: FiltrosClienteQueryDto,
  ): Promise<RespostaPaginada<ClienteRespostaDto>> {
    return this.clientesService.listar(filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um cliente pelo id' })
  @ApiParam({ name: 'id', example: 1, description: 'Id do cliente.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cliente encontrado, com os veiculos resumidos.',
    type: ClienteDetalheRespostaDto,
  })
  @ApiErros(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  buscarPorId(
    @Param('id', ParseIdPipe) id: number,
  ): Promise<ClienteDetalheRespostaDto> {
    return this.clientesService.buscarPorId(id);
  }

  @Get(':id/veiculos')
  @ApiOperation({
    summary: 'Lista os veiculos de um cliente',
    description:
      'Relacionamento Cliente 1:N Veiculo. Devolve um array simples, sem paginacao.',
  })
  @ApiParam({ name: 'id', example: 3, description: 'Id do cliente.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Veiculos do cliente. Array vazio quando ele nao possui nenhum.',
    type: [VeiculoDoClienteDto],
  })
  @ApiErros(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  listarVeiculos(
    @Param('id', ParseIdPipe) id: number,
  ): Promise<VeiculoDoClienteDto[]> {
    return this.clientesService.listarVeiculos(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastra um cliente' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Cliente cadastrado.',
    type: ClienteRespostaDto,
  })
  @ApiErros(HttpStatus.BAD_REQUEST, CodigosErro.REGISTRO_DUPLICADO)
  criar(@Body() dto: CriarClienteDto): Promise<ClienteRespostaDto> {
    return this.clientesService.criar(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Substitui os dados de um cliente',
    description: 'Substituicao completa: todos os campos sao obrigatorios.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Id do cliente.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cliente atualizado.',
    type: ClienteRespostaDto,
  })
  @ApiErros(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    CodigosErro.REGISTRO_DUPLICADO,
  )
  atualizar(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: AtualizarClienteDto,
  ): Promise<ClienteRespostaDto> {
    return this.clientesService.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclui um cliente',
    description:
      'Só é permitido excluir clientes sem veiculos vinculados (FK com Restrict).',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Id do cliente.' })
  @ApiNoContentResponse({ description: 'Cliente excluido.' })
  @ApiErros(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    CodigosErro.RECURSO_EM_USO,
  )
  remover(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.clientesService.remover(id);
  }
}
