import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/** Quantidade minima e maxima de um servico em uma ordem. */
export const QUANTIDADE_MINIMA = 1;
export const QUANTIDADE_MAXIMA = 99;

/**
 * Item enviado pelo cliente da API. O `precoUnitario` **nao** faz parte do
 * corpo: ele e copiado do catalogo pelo servidor.
 */
export class ItemOrdemServicoDto {
  @ApiProperty({
    example: 1,
    minimum: 1,
    description: 'Id do servico do catalogo.',
  })
  @Type(() => Number)
  @IsInt({ message: 'servicoId deve ser um numero inteiro.' })
  @Min(1, { message: 'servicoId deve ser um numero inteiro positivo.' })
  servicoId!: number;

  @ApiProperty({
    example: 2,
    minimum: QUANTIDADE_MINIMA,
    maximum: QUANTIDADE_MAXIMA,
    description: 'Quantidade do servico na ordem.',
  })
  @Type(() => Number)
  @IsInt({ message: 'quantidade deve ser um numero inteiro.' })
  @Min(QUANTIDADE_MINIMA, {
    message: `quantidade deve ser maior ou igual a ${QUANTIDADE_MINIMA}.`,
  })
  @Max(QUANTIDADE_MAXIMA, {
    message: `quantidade deve ser menor ou igual a ${QUANTIDADE_MAXIMA}.`,
  })
  quantidade!: number;
}
