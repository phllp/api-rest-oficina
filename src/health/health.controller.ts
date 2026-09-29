import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErros } from '../common/decorators/api-erros.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { RespostaHealthDto } from './dto/health-response.dto.js';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
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
  @ApiErros(HttpStatus.SERVICE_UNAVAILABLE)
  verificar(): Promise<RespostaHealthDto> {
    return this.healthService.verificar();
  }
}
