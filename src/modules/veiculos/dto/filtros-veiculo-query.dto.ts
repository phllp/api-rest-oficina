import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginacaoQueryDto } from '../../../common/dto/paginacao-query.dto.js';
import {
  paraPlaca,
  paraTextoAparado,
} from '../../../common/transformers/transformers.js';
import { ANO_MAXIMO, ANO_MINIMO } from './criar-veiculo.dto.js';

export class FiltrosVeiculoQueryDto extends PaginacaoQueryDto {
  @ApiPropertyOptional({
    example: 'ABC',
    description:
      'Busca parcial pela placa. O valor e normalizado (maiusculas, sem hifen) antes da busca.',
  })
  @IsOptional()
  @Transform(paraPlaca)
  @IsString({ message: 'placa deve ser um texto.' })
  placa?: string;

  @ApiPropertyOptional({
    example: 'fiat',
    description: 'Busca parcial pela marca, sem diferenciar maiusculas.',
  })
  @IsOptional()
  @Transform(paraTextoAparado)
  @IsString({ message: 'marca deve ser um texto.' })
  marca?: string;

  @ApiPropertyOptional({
    example: 'argo',
    description: 'Busca parcial pelo modelo, sem diferenciar maiusculas.',
  })
  @IsOptional()
  @Transform(paraTextoAparado)
  @IsString({ message: 'modelo deve ser um texto.' })
  modelo?: string;

  @ApiPropertyOptional({
    example: 2021,
    description: 'Busca exata pelo ano do veiculo.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ano deve ser um numero inteiro.' })
  @Min(ANO_MINIMO, { message: `ano deve ser maior ou igual a ${ANO_MINIMO}.` })
  @Max(ANO_MAXIMO, { message: `ano deve ser menor ou igual a ${ANO_MAXIMO}.` })
  ano?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Filtra apenas os veiculos do cliente informado.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'cliente_id deve ser um numero inteiro.' })
  @Min(1, { message: 'cliente_id deve ser um numero inteiro positivo.' })
  cliente_id?: number;
}
