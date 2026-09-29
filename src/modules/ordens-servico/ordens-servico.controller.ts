import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { AlterarStatusDto } from './dto/alterar-status.dto.js';
import { AtualizarOrdemServicoDto } from './dto/atualizar-ordem-servico.dto.js';
import { CriarOrdemServicoDto } from './dto/criar-ordem-servico.dto.js';
import { FiltrosOrdemServicoQueryDto } from './dto/filtros-ordem-servico-query.dto.js';
import {
  OrdemServicoDetalheDto,
  OrdemServicoResumoDto,
} from './dto/ordem-servico-resposta.dto.js';
import {
  OrdensServicoService,
  type OrdemServicoDetalhe,
  type OrdemServicoResumo,
} from './ordens-servico.service.js';

@ApiTags('ordens-servico')
@ApiRotaProtegida()
@Controller('ordens-servico')
export class OrdensServicoController {
  constructor(private readonly ordensServicoService: OrdensServicoService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as ordens de servico',
    description:
      'Listagem paginada, da mais recente para a mais antiga, com filtros por status, veiculo, mecanico, cliente e intervalo de abertura.',
  })
  @ApiPaginatedResponse(
    OrdemServicoResumoDto,
    'Lista paginada de ordens de servico no formato resumido.',
  )
  @ApiErros(HttpStatus.BAD_REQUEST)
  listar(
    @Query() filtros: FiltrosOrdemServicoQueryDto,
  ): Promise<RespostaPaginada<OrdemServicoResumo>> {
    return this.ordensServicoService.listar(filtros);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Busca uma ordem de servico pelo id',
    description:
      'Detalhe completo: veiculo com o cliente, mecanico, itens com subtotal e valor total.',
  })
  @ApiParam({ name: 'id', example: 12, description: 'Id da ordem de servico.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ordem de servico encontrada.',
    type: OrdemServicoDetalheDto,
  })
  @ApiErros(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  buscarPorId(
    @Param('id', ParseIdPipe) id: number,
  ): Promise<OrdemServicoDetalhe> {
    return this.ordensServicoService.buscarPorId(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Abre uma ordem de servico',
    description:
      'A ordem nasce com status ABERTA e dataAbertura = agora. O precoUnitario de cada item e copiado do catalogo pelo servidor.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Ordem de servico aberta.',
    type: OrdemServicoDetalheDto,
  })
  @ApiErros(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    CodigosErro.OPERACAO_NAO_PERMITIDA,
  )
  criar(@Body() dto: CriarOrdemServicoDto): Promise<OrdemServicoDetalhe> {
    return this.ordensServicoService.criar(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Substitui os dados editaveis de uma ordem de servico',
    description:
      'Permitido apenas em ABERTA ou EM_ANDAMENTO. O veiculo e imutavel (veiculoId nao faz parte do corpo). Os itens substituem os anteriores: servico que ja estava na ordem mantem o preco original; servico novo usa o preco atual e precisa estar ativo.',
  })
  @ApiParam({ name: 'id', example: 12, description: 'Id da ordem de servico.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ordem de servico atualizada.',
    type: OrdemServicoDetalheDto,
  })
  @ApiErros(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    CodigosErro.OPERACAO_NAO_PERMITIDA,
  )
  atualizar(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: AtualizarOrdemServicoDto,
  ): Promise<OrdemServicoDetalhe> {
    return this.ordensServicoService.atualizar(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Altera o status de uma ordem de servico',
    description:
      'Transicoes: ABERTA -> EM_ANDAMENTO | CANCELADA; EM_ANDAMENTO -> CONCLUIDA | CANCELADA. CONCLUIDA e CANCELADA sao finais. EM_ANDAMENTO e CONCLUIDA exigem mecanico atribuido; ao concluir, dataConclusao recebe o instante atual.',
  })
  @ApiParam({ name: 'id', example: 12, description: 'Id da ordem de servico.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status alterado.',
    type: OrdemServicoDetalheDto,
  })
  @ApiErros(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    CodigosErro.OPERACAO_NAO_PERMITIDA,
  )
  alterarStatus(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: AlterarStatusDto,
  ): Promise<OrdemServicoDetalhe> {
    return this.ordensServicoService.alterarStatus(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclui uma ordem de servico',
    description:
      'Permitido apenas com status ABERTA (os itens saem em cascata). Ordens ja iniciadas devem ser encerradas com PATCH de status para CANCELADA.',
  })
  @ApiParam({ name: 'id', example: 12, description: 'Id da ordem de servico.' })
  @ApiNoContentResponse({ description: 'Ordem de servico excluida.' })
  @ApiErros(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    CodigosErro.OPERACAO_NAO_PERMITIDA,
  )
  remover(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.ordensServicoService.remover(id);
  }
}
