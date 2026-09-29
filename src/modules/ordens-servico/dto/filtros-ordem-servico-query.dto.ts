import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusOrdemServico } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Matches, Min } from 'class-validator';
import { PaginacaoQueryDto } from '../../../common/dto/paginacao-query.dto.js';
import { paraListaSeparadaPorVirgula } from '../../../common/transformers/transformers.js';
import { MenorOuIgualAoCampo } from '../../../common/validators/menor-ou-igual-ao-campo.validator.js';

const VALORES_STATUS = Object.values(StatusOrdemServico);
const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Filtro de status aceito tambem pelos endpoints aninhados. */
export class FiltroStatusQueryDto {
  @ApiPropertyOptional({
    type: String,
    example: 'ABERTA,EM_ANDAMENTO',
    description: `Um ou mais status separados por virgula. Valores aceitos: ${VALORES_STATUS.join(', ')}.`,
  })
  @IsOptional()
  @Transform(paraListaSeparadaPorVirgula)
  @IsEnum(StatusOrdemServico, {
    each: true,
    message: `status aceita apenas estes valores, separados por vírgula: ${VALORES_STATUS.join(', ')}.`,
  })
  status?: StatusOrdemServico[];
}

export class FiltrosOrdemServicoQueryDto extends PaginacaoQueryDto {
  @ApiPropertyOptional({
    type: String,
    example: 'ABERTA,EM_ANDAMENTO',
    description: `Um ou mais status separados por virgula. Valores aceitos: ${VALORES_STATUS.join(', ')}.`,
  })
  @IsOptional()
  @Transform(paraListaSeparadaPorVirgula)
  @IsEnum(StatusOrdemServico, {
    each: true,
    message: `status aceita apenas estes valores, separados por vírgula: ${VALORES_STATUS.join(', ')}.`,
  })
  status?: StatusOrdemServico[];

  @ApiPropertyOptional({
    example: 1,
    description: 'Filtra as ordens de um veiculo especifico.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'veiculo_id deve ser um numero inteiro.' })
  @Min(1, { message: 'veiculo_id deve ser um numero inteiro positivo.' })
  veiculo_id?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Filtra as ordens atribuidas a um mecanico especifico.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'mecanico_id deve ser um numero inteiro.' })
  @Min(1, { message: 'mecanico_id deve ser um numero inteiro positivo.' })
  mecanico_id?: number;

  @ApiPropertyOptional({
    example: 3,
    description:
      'Filtra as ordens de todos os veiculos de um cliente especifico.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'cliente_id deve ser um numero inteiro.' })
  @Min(1, { message: 'cliente_id deve ser um numero inteiro positivo.' })
  cliente_id?: number;

  @ApiPropertyOptional({
    example: '2026-03-01',
    description:
      'Data inicial da abertura (YYYY-MM-DD), inclusiva, interpretada em UTC a partir de 00:00:00.000Z.',
  })
  @IsOptional()
  @Matches(FORMATO_DATA, {
    message: 'data_inicio deve estar no formato YYYY-MM-DD.',
  })
  @MenorOuIgualAoCampo('data_fim')
  data_inicio?: string;

  @ApiPropertyOptional({
    example: '2026-03-31',
    description:
      'Data final da abertura (YYYY-MM-DD), inclusiva, interpretada em UTC ate 23:59:59.999Z.',
  })
  @IsOptional()
  @Matches(FORMATO_DATA, {
    message: 'data_fim deve estar no formato YYYY-MM-DD.',
  })
  data_fim?: string;
}
