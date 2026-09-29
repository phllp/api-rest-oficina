import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginacaoQueryDto } from '../../../common/dto/paginacao-query.dto.js';
import {
  paraBooleano,
  paraTextoAparado,
} from '../../../common/transformers/transformers.js';

export class FiltrosMecanicoQueryDto extends PaginacaoQueryDto {
  @ApiPropertyOptional({
    example: 'adilson',
    description: 'Busca parcial pelo nome, sem diferenciar maiusculas.',
  })
  @IsOptional()
  @Transform(paraTextoAparado)
  @IsString({ message: 'nome deve ser um texto.' })
  nome?: string;

  @ApiPropertyOptional({
    example: 'freios',
    description:
      'Busca parcial pela especialidade, sem diferenciar maiusculas.',
  })
  @IsOptional()
  @Transform(paraTextoAparado)
  @IsString({ message: 'especialidade deve ser um texto.' })
  especialidade?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Filtra somente ativos (true) ou somente inativos (false). Aceita apenas "true" ou "false".',
  })
  @IsOptional()
  @Transform(paraBooleano)
  @IsBoolean({ message: 'ativo deve ser true ou false.' })
  ativo?: boolean;
}
