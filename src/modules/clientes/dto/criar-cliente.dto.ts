import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches } from 'class-validator';
import {
  paraMinusculas,
  paraSomenteDigitos,
  paraTextoAparado,
} from '../../../common/transformers/transformers.js';
import { IsCpf } from '../../../common/validators/is-cpf.validator.js';

export class CriarClienteDto {
  @ApiProperty({
    example: 'Ana Paula Ribeiro',
    minLength: 2,
    maxLength: 120,
    description: 'Nome completo do cliente.',
  })
  @Transform(paraTextoAparado)
  @IsString({ message: 'nome deve ser um texto.' })
  @Length(2, 120, { message: 'nome deve ter entre 2 e 120 caracteres.' })
  nome!: string;

  @ApiProperty({
    example: '52998224725',
    description:
      'CPF do cliente. Aceita com ou sem mascara; e armazenado somente com digitos.',
  })
  @Transform(paraSomenteDigitos)
  @IsCpf()
  cpf!: string;

  @ApiProperty({
    example: 'ana.1@email.com',
    maxLength: 160,
    description: 'E-mail do cliente. Armazenado em minusculas.',
  })
  @Transform(paraMinusculas)
  @IsEmail({}, { message: 'email deve ser um e-mail válido.' })
  @Length(5, 160, { message: 'email deve ter no máximo 160 caracteres.' })
  email!: string;

  @ApiProperty({
    example: '47991012233',
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
