import { ApiProperty } from '@nestjs/swagger';

export class ServicoRespostaDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Troca de oleo e filtro' })
  descricao!: string;

  @ApiProperty({
    example: 189.9,
    type: Number,
    description: 'Preco do servico, sempre serializado como number.',
  })
  preco!: number;

  @ApiProperty({ example: 45 })
  tempoEstimadoMin!: number;

  @ApiProperty({ example: true })
  ativo!: boolean;

  @ApiProperty({ example: '2026-09-28T22:52:10.512Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-28T22:52:10.512Z' })
  updatedAt!: Date;
}
