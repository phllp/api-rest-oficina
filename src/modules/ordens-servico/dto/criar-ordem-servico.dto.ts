import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { OrdemServicoBaseDto } from './ordem-servico-base.dto.js';

export class CriarOrdemServicoDto extends OrdemServicoBaseDto {
  @ApiProperty({
    example: 1,
    minimum: 1,
    description:
      'Id do veiculo atendido. Definido na criacao e imutavel depois disso.',
  })
  @Type(() => Number)
  @IsInt({ message: 'veiculoId deve ser um numero inteiro.' })
  @Min(1, { message: 'veiculoId deve ser um numero inteiro positivo.' })
  veiculoId!: number;
}
