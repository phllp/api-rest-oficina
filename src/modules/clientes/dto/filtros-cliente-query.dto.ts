import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length } from 'class-validator';
import { PaginacaoQueryDto } from '../../../common/dto/paginacao-query.dto.js';
import {
  paraMinusculas,
  paraSomenteDigitos,
  paraTextoAparado,
} from '../../../common/transformers/transformers.js';

export class FiltrosClienteQueryDto extends PaginacaoQueryDto {
  @ApiPropertyOptional({
    example: 'ana',
    description: 'Busca parcial pelo nome, sem diferenciar maiusculas.',
  })
  @IsOptional()
  @Transform(paraTextoAparado)
  @IsString({ message: 'nome deve ser um texto.' })
  nome?: string;

  @ApiPropertyOptional({
    example: '52998224725',
    description: 'Busca exata por CPF. Aceita com ou sem mascara.',
  })
  @IsOptional()
  @Transform(paraSomenteDigitos)
  @IsString({ message: 'cpf deve ser um texto.' })
  @Length(11, 11, { message: 'cpf deve ter 11 dígitos.' })
  cpf?: string;

  @ApiPropertyOptional({
    example: 'email.com',
    description: 'Busca parcial pelo e-mail, sem diferenciar maiusculas.',
  })
  @IsOptional()
  @Transform(paraMinusculas)
  @IsString({ message: 'email deve ser um texto.' })
  email?: string;
}
