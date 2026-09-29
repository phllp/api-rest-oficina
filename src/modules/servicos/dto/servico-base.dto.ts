import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNumber, IsString, Length, Max, Min } from 'class-validator';
import { paraTextoAparado } from '../../../common/transformers/transformers.js';

/** Limite do Decimal(10,2) usado na coluna de preco. */
export const PRECO_MAXIMO = 99999999.99;
/** Tempo estimado minimo e maximo, em minutos (5 min a 48 h). */
export const TEMPO_MINIMO_MIN = 5;
export const TEMPO_MAXIMO_MIN = 2880;

/**
 * Campos comuns aos DTOs de criacao e atualizacao.
 *
 * O campo `ativo` fica fora desta base porque e opcional no POST e
 * obrigatorio no PUT -- ver o comentario em MecanicoBaseDto.
 */
export class ServicoBaseDto {
  @ApiProperty({
    example: 'Troca de oleo e filtro',
    minLength: 3,
    maxLength: 150,
    description: 'Descricao do servico no catalogo.',
  })
  @Transform(paraTextoAparado)
  @IsString({ message: 'descricao deve ser um texto.' })
  @Length(3, 150, { message: 'descricao deve ter entre 3 e 150 caracteres.' })
  descricao!: string;

  @ApiProperty({
    example: 189.9,
    minimum: 0.01,
    maximum: PRECO_MAXIMO,
    description:
      'Preco do servico, com no maximo 2 casas decimais. Enviado e devolvido como number.',
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'preco deve ser um número com no máximo 2 casas decimais.' },
  )
  @Min(0.01, { message: 'preco deve ser maior que zero.' })
  @Max(PRECO_MAXIMO, {
    message: `preco deve ser menor ou igual a ${PRECO_MAXIMO}.`,
  })
  preco!: number;

  @ApiProperty({
    example: 45,
    minimum: TEMPO_MINIMO_MIN,
    maximum: TEMPO_MAXIMO_MIN,
    description: 'Tempo estimado de execucao, em minutos.',
  })
  @Type(() => Number)
  @IsInt({ message: 'tempoEstimadoMin deve ser um numero inteiro.' })
  @Min(TEMPO_MINIMO_MIN, {
    message: `tempoEstimadoMin deve ser maior ou igual a ${TEMPO_MINIMO_MIN}.`,
  })
  @Max(TEMPO_MAXIMO_MIN, {
    message: `tempoEstimadoMin deve ser menor ou igual a ${TEMPO_MAXIMO_MIN}.`,
  })
  tempoEstimadoMin!: number;
}
