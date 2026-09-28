import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VeiculoRespostaDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'ABC1234' })
  placa!: string;

  @ApiProperty({ example: 'Fiat' })
  marca!: string;

  @ApiProperty({ example: 'Argo Drive 1.0' })
  modelo!: string;

  @ApiProperty({ example: 2021 })
  ano!: number;

  @ApiPropertyOptional({ example: 'Branco', nullable: true })
  cor!: string | null;

  @ApiProperty({ example: 3 })
  clienteId!: number;

  @ApiProperty({ example: '2026-09-28T22:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-28T22:30:00.000Z' })
  updatedAt!: Date;
}

/** Cliente resumido, como aparece dentro do detalhe do veiculo. */
export class ClienteDoVeiculoResumoDto {
  @ApiProperty({ example: 3 })
  id!: number;

  @ApiProperty({ example: 'Carla Menezes Duarte' })
  nome!: string;

  @ApiProperty({ example: '47993034455' })
  telefone!: string;
}

export class VeiculoDetalheRespostaDto extends VeiculoRespostaDto {
  @ApiProperty({ type: ClienteDoVeiculoResumoDto })
  cliente!: ClienteDoVeiculoResumoDto;
}
