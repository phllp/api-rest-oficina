import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';
import {
  paraSomenteDigitos,
  paraTextoAparado,
} from '../../../common/transformers/transformers.js';

/**
 * Campos comuns aos DTOs de criacao e atualizacao.
 *
 * O campo `ativo` fica **fora** desta base de proposito: ele e opcional no
 * POST e obrigatorio no PUT, e o class-validator herda `@IsOptional()` das
 * classes pai -- um `AtualizarDto extends CriarDto` nao consegue tornar o
 * campo obrigatorio de novo.
 */
export class MecanicoBaseDto {
  @ApiProperty({
    example: 'Adilson Moita',
    minLength: 2,
    maxLength: 120,
    description: 'Nome do mecanico.',
  })
  @Transform(paraTextoAparado)
  @IsString({ message: 'nome deve ser um texto.' })
  @Length(2, 120, { message: 'nome deve ter entre 2 e 120 caracteres.' })
  nome!: string;

  @ApiProperty({
    example: 'Motor e injecao eletronica',
    minLength: 2,
    maxLength: 80,
    description: 'Area de atuacao do mecanico.',
  })
  @Transform(paraTextoAparado)
  @IsString({ message: 'especialidade deve ser um texto.' })
  @Length(2, 80, {
    message: 'especialidade deve ter entre 2 e 80 caracteres.',
  })
  especialidade!: string;

  @ApiProperty({
    example: '4733441001',
    description:
      'Telefone com DDD, 10 ou 11 digitos. Aceita mascara; e armazenado somente com digitos.',
  })
  @Transform(paraSomenteDigitos)
  @IsString({ message: 'telefone deve ser um texto.' })
  @Matches(/^\d{10,11}$/, {
    message: 'telefone deve ter 10 ou 11 dígitos, incluindo o DDD.',
  })
  telefone!: string;
}
