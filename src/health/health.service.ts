import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ApiException } from '../common/errors/api.exception.js';
import { CodigosErro } from '../common/errors/codigos-erro.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RespostaHealthDto } from './dto/health-response.dto.js';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executa uma consulta trivial no PostgreSQL para confirmar que a
   * aplicacao consegue falar com o banco de dados.
   */
  async verificar(): Promise<RespostaHealthDto> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return { status: 'ok', database: 'up' };
    } catch (erro) {
      this.logger.error(
        'Falha ao verificar a conexao com o banco de dados.',
        erro instanceof Error ? erro.stack : String(erro),
      );

      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        CodigosErro.BANCO_INDISPONIVEL,
        'Não foi possível conectar ao banco de dados.',
      );
    }
  }
}
