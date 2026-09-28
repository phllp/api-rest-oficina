import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClienteRespostaDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Ana Paula Ribeiro' })
  nome!: string;

  @ApiProperty({ example: '52998224725' })
  cpf!: string;

  @ApiProperty({ example: 'ana.1@email.com' })
  email!: string;

  @ApiProperty({ example: '47991012233' })
  telefone!: string;

  @ApiProperty({ example: '2026-09-28T22:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-28T22:30:00.000Z' })
  updatedAt!: Date;
}

/** Veiculo resumido, como aparece dentro do detalhe do cliente. */
export class VeiculoDoClienteResumoDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'ABC1234' })
  placa!: string;

  @ApiProperty({ example: 'Fiat' })
  marca!: string;

  @ApiProperty({ example: 'Argo Drive 1.0' })
  modelo!: string;
}

/** Veiculo do cliente na listagem de GET /clientes/{id}/veiculos. */
export class VeiculoDoClienteDto extends VeiculoDoClienteResumoDto {
  @ApiProperty({ example: 2021 })
  ano!: number;

  @ApiPropertyOptional({ example: 'Branco', nullable: true })
  cor!: string | null;
}

export class ClienteDetalheRespostaDto extends ClienteRespostaDto {
  @ApiProperty({ type: [VeiculoDoClienteResumoDto] })
  veiculos!: VeiculoDoClienteResumoDto[];
}
