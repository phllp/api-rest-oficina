import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';
import { paraBooleano } from '../../../common/transformers/transformers.js';
import { MecanicoBaseDto } from './mecanico-base.dto.js';

/**
 * PUT e substituicao completa: `ativo` e **obrigatorio** aqui, para o cliente
 * da API nao reativar um mecanico sem perceber ao omitir o campo.
 */
export class AtualizarMecanicoDto extends MecanicoBaseDto {
  @ApiProperty({
    example: true,
    description: 'Indica se o mecanico esta ativo. Obrigatorio no PUT.',
  })
  @Transform(paraBooleano)
  @IsBoolean({ message: 'ativo deve ser true ou false.' })
  ativo!: boolean;
}
