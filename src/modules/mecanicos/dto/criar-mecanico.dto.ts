import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { paraBooleano } from '../../../common/transformers/transformers.js';
import { MecanicoBaseDto } from './mecanico-base.dto.js';

export class CriarMecanicoDto extends MecanicoBaseDto {
  /**
   * Opcional no cadastro. Quando omitido, nada e enviado ao banco e vale o
   * default `true` da coluna (ver prisma/schema.prisma).
   */
  @ApiPropertyOptional({
    example: true,
    default: true,
    description:
      'Indica se o mecanico esta ativo. Mecanicos inativos nao devem receber novas ordens de servico. Quando omitido, assume true.',
  })
  @IsOptional()
  @Transform(paraBooleano)
  @IsBoolean({ message: 'ativo deve ser true ou false.' })
  ativo?: boolean;
}
