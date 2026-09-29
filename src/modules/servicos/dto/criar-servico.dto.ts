import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { paraBooleano } from '../../../common/transformers/transformers.js';
import { ServicoBaseDto } from './servico-base.dto.js';

export class CriarServicoDto extends ServicoBaseDto {
  /**
   * Opcional no cadastro. Quando omitido, vale o default `true` da coluna
   * (ver prisma/schema.prisma).
   */
  @ApiPropertyOptional({
    example: true,
    default: true,
    description:
      'Indica se o servico esta disponivel. Servicos inativos nao devem ser lancados em novas ordens. Quando omitido, assume true.',
  })
  @IsOptional()
  @Transform(paraBooleano)
  @IsBoolean({ message: 'ativo deve ser true ou false.' })
  ativo?: boolean;
}
