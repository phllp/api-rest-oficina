import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import {
  paraPlaca,
  paraTextoAparado,
} from '../../../common/transformers/transformers.js';
import { IsPlaca } from '../../../common/validators/is-placa.validator.js';

/** Ano mais antigo aceito no cadastro de veiculos. */
export const ANO_MINIMO = 1950;
/** Modelos do ano seguinte ja podem ser cadastrados. */
export const ANO_MAXIMO = new Date().getFullYear() + 1;

export class CriarVeiculoDto {
  @ApiProperty({
    example: 'ABC1D23',
    description:
      'Placa no padrao antigo (ABC1234) ou Mercosul (ABC1D23). Aceita minusculas e hifen; e armazenada em maiusculas e sem hifen.',
  })
  @Transform(paraPlaca)
  @IsPlaca()
  placa!: string;

  @ApiProperty({
    example: 'Fiat',
    minLength: 2,
    maxLength: 50,
    description: 'Marca do veiculo.',
  })
  @Transform(paraTextoAparado)
  @IsString({ message: 'marca deve ser um texto.' })
  @Length(2, 50, { message: 'marca deve ter entre 2 e 50 caracteres.' })
  marca!: string;

  @ApiProperty({
    example: 'Argo Drive 1.0',
    minLength: 1,
    maxLength: 80,
    description: 'Modelo do veiculo.',
  })
  @Transform(paraTextoAparado)
  @IsString({ message: 'modelo deve ser um texto.' })
  @Length(1, 80, { message: 'modelo deve ter entre 1 e 80 caracteres.' })
  modelo!: string;

  @ApiProperty({
    example: 2021,
    minimum: ANO_MINIMO,
    maximum: ANO_MAXIMO,
    description: `Ano do veiculo, entre ${ANO_MINIMO} e ${ANO_MAXIMO}.`,
  })
  @Type(() => Number)
  @IsInt({ message: 'ano deve ser um numero inteiro.' })
  @Min(ANO_MINIMO, { message: `ano deve ser maior ou igual a ${ANO_MINIMO}.` })
  @Max(ANO_MAXIMO, { message: `ano deve ser menor ou igual a ${ANO_MAXIMO}.` })
  ano!: number;

  @ApiPropertyOptional({
    example: 'Branco',
    maxLength: 30,
    description: 'Cor do veiculo.',
  })
  @IsOptional()
  @Transform(paraTextoAparado)
  @IsString({ message: 'cor deve ser um texto.' })
  @Length(1, 30, { message: 'cor deve ter no máximo 30 caracteres.' })
  cor?: string;

  @ApiProperty({
    example: 3,
    minimum: 1,
    description: 'Id do cliente proprietario do veiculo.',
  })
  @Type(() => Number)
  @IsInt({ message: 'clienteId deve ser um numero inteiro.' })
  @Min(1, { message: 'clienteId deve ser um numero inteiro positivo.' })
  clienteId!: number;
}
