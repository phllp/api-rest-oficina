import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RespostaHealthDto } from './dto/health-response.dto.js';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verifica a saude da API',
    description:
      'Confirma que a aplicacao esta no ar e que a conexao com o PostgreSQL esta funcionando.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API e banco de dados respondendo normalmente.',
    type: RespostaHealthDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Banco de dados indisponivel.',
    schema: {
      example: {
        status: 503,
        erro: 'BANCO_INDISPONIVEL',
        mensagem: 'Nao foi possivel conectar ao banco de dados.',
      },
    },
  })
  verificar(): Promise<RespostaHealthDto> {
    return this.healthService.verificar();
  }
}
