import { ApiProperty } from '@nestjs/swagger';

export class MecanicoRespostaDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Adilson Moita' })
  nome!: string;

  @ApiProperty({ example: 'Motor e injecao eletronica' })
  especialidade!: string;

  @ApiProperty({ example: '4733441001' })
  telefone!: string;

  @ApiProperty({ example: true })
  ativo!: boolean;

  @ApiProperty({ example: '2026-09-28T22:52:10.512Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-28T22:52:10.512Z' })
  updatedAt!: Date;
}

export class MecanicoDetalheRespostaDto extends MecanicoRespostaDto {
  @ApiProperty({
    example: 6,
    description: 'Quantidade de ordens de servico vinculadas ao mecanico.',
  })
  totalOrdensServico!: number;
}
