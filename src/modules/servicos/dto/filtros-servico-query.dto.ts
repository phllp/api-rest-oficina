import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginacaoQueryDto } from '../../../common/dto/paginacao-query.dto.js';
import {
  paraBooleano,
  paraTextoAparado,
} from '../../../common/transformers/transformers.js';
import { MenorOuIgualAoCampo } from '../../../common/validators/menor-ou-igual-ao-campo.validator.js';

/** Campos pelos quais a listagem pode ser ordenada. */
export const CAMPOS_ORDENACAO_SERVICO = [
  'descricao',
  'preco',
  'tempo_estimado',
] as const;
export type CampoOrdenacaoServico = (typeof CAMPOS_ORDENACAO_SERVICO)[number];

/** Sentidos de ordenacao aceitos. */
export const SENTIDOS_ORDENACAO = ['asc', 'desc'] as const;
export type SentidoOrdenacao = (typeof SENTIDOS_ORDENACAO)[number];

export class FiltrosServicoQueryDto extends PaginacaoQueryDto {
  @ApiPropertyOptional({
    example: 'troca',
    description: 'Busca parcial pela descricao, sem diferenciar maiusculas.',
  })
  @IsOptional()
  @Transform(paraTextoAparado)
  @IsString({ message: 'descricao deve ser um texto.' })
  descricao?: string;

  @ApiPropertyOptional({
    example: 100,
    description: 'Preco minimo, inclusivo. Nao pode ser maior que preco_max.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'preco_min deve ser um número.' })
  @Min(0, { message: 'preco_min não pode ser negativo.' })
  @MenorOuIgualAoCampo('preco_max')
  preco_min?: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Preco maximo, inclusivo.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'preco_max deve ser um número.' })
  @Min(0, { message: 'preco_max não pode ser negativo.' })
  preco_max?: number;

  @ApiPropertyOptional({
    example: true,
    description:
      'Filtra somente ativos (true) ou somente inativos (false). Aceita apenas "true" ou "false".',
  })
  @IsOptional()
  @Transform(paraBooleano)
  @IsBoolean({ message: 'ativo deve ser true ou false.' })
  ativo?: boolean;

  @ApiPropertyOptional({
    enum: CAMPOS_ORDENACAO_SERVICO,
    default: 'descricao',
    description: 'Campo usado na ordenacao da listagem.',
  })
  @IsOptional()
  @IsIn(CAMPOS_ORDENACAO_SERVICO, {
    message: `ordenar_por deve ser um destes valores: ${CAMPOS_ORDENACAO_SERVICO.join(', ')}.`,
  })
  ordenar_por: CampoOrdenacaoServico = 'descricao';

  @ApiPropertyOptional({
    enum: SENTIDOS_ORDENACAO,
    default: 'asc',
    description: 'Sentido da ordenacao.',
  })
  @IsOptional()
  @IsIn(SENTIDOS_ORDENACAO, {
    message: `ordem deve ser um destes valores: ${SENTIDOS_ORDENACAO.join(', ')}.`,
  })
  ordem: SentidoOrdenacao = 'asc';
}
