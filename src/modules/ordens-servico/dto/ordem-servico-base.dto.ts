import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { paraTextoAparado } from '../../../common/transformers/transformers.js';
import { SemDuplicatasPor } from '../../../common/validators/sem-duplicatas-por.validator.js';
import { ItemOrdemServicoDto } from './item-ordem-servico.dto.js';

/**
 * Campos comuns a criacao e atualizacao de uma ordem de servico.
 *
 * `veiculoId` fica **fora** desta base: o veiculo e definido na criacao e nao
 * pode mudar depois (ver AtualizarOrdemServicoDto).
 * `status`, `valorTotal`, `dataAbertura` e `dataConclusao` nunca vem do
 * cliente da API -- sao controlados pelo servidor.
 */
export class OrdemServicoBaseDto {
  @ApiPropertyOptional({
    example: 2,
    nullable: true,
    description:
      'Id do mecanico responsavel. Pode ser null enquanto a ordem nao for distribuida.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'mecanicoId deve ser um numero inteiro.' })
  @Min(1, { message: 'mecanicoId deve ser um numero inteiro positivo.' })
  mecanicoId?: number | null;

  @ApiProperty({
    example: 'Barulho no motor ao acelerar em subida.',
    minLength: 5,
    maxLength: 500,
    description: 'Relato do problema informado pelo cliente.',
  })
  @Transform(paraTextoAparado)
  @IsString({ message: 'descricaoProblema deve ser um texto.' })
  @Length(5, 500, {
    message: 'descricaoProblema deve ter entre 5 e 500 caracteres.',
  })
  descricaoProblema!: string;

  @ApiPropertyOptional({
    example: 'Cliente autorizou a troca do filtro por telefone.',
    maxLength: 1000,
    description: 'Anotacoes internas da oficina.',
  })
  @IsOptional()
  @Transform(paraTextoAparado)
  @IsString({ message: 'observacoes deve ser um texto.' })
  @Length(1, 1000, {
    message: 'observacoes deve ter no máximo 1000 caracteres.',
  })
  observacoes?: string;

  @ApiProperty({
    type: [ItemOrdemServicoDto],
    description:
      'Servicos lancados na ordem. Pelo menos um, sem repetir o mesmo servicoId.',
  })
  @IsArray({ message: 'itens deve ser uma lista.' })
  @ArrayMinSize(1, { message: 'itens deve ter pelo menos um servico.' })
  @SemDuplicatasPor('servicoId')
  @ValidateNested({ each: true })
  @Type(() => ItemOrdemServicoDto)
  itens!: ItemOrdemServicoDto[];
}
