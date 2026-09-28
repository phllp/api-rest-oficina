import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
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

      throw new ServiceUnavailableException({
        status: 503,
        erro: 'BANCO_INDISPONIVEL',
        mensagem: 'Nao foi possivel conectar ao banco de dados.',
      });
    }
  }
}
