import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusOrdemServico } from '@prisma/client';

// ---------------------------------------------------------------------------
// Blocos aninhados
// ---------------------------------------------------------------------------

export class VeiculoDaOrdemResumoDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'ABC1234' })
  placa!: string;

  @ApiProperty({ example: 'Argo Drive 1.0' })
  modelo!: string;
}

export class MecanicoDaOrdemResumoDto {
  @ApiProperty({ example: 2 })
  id!: number;

  @ApiProperty({ example: 'Cleber Ramos' })
  nome!: string;
}

export class ClienteDaOrdemDto {
  @ApiProperty({ example: 3 })
  id!: number;

  @ApiProperty({ example: 'Carla Menezes Duarte' })
  nome!: string;

  @ApiProperty({ example: '47993034455' })
  telefone!: string;
}

export class VeiculoDaOrdemDto extends VeiculoDaOrdemResumoDto {
  @ApiProperty({ example: 'Fiat' })
  marca!: string;

  @ApiProperty({ type: ClienteDaOrdemDto })
  cliente!: ClienteDaOrdemDto;
}

export class MecanicoDaOrdemDto extends MecanicoDaOrdemResumoDto {
  @ApiProperty({ example: 'Suspensao e freios' })
  especialidade!: string;
}

export class ServicoDoItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Troca de oleo e filtro' })
  descricao!: string;
}

export class ItemDaOrdemRespostaDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ type: ServicoDoItemDto })
  servico!: ServicoDoItemDto;

  @ApiProperty({ example: 2 })
  quantidade!: number;

  @ApiProperty({
    example: 189.9,
    type: Number,
    description:
      'Preco do servico no momento em que ele foi lancado na ordem. Reajustes no catalogo nao alteram este valor.',
  })
  precoUnitario!: number;

  @ApiProperty({
    example: 379.8,
    type: Number,
    description: 'quantidade x precoUnitario. Calculado, nao armazenado.',
  })
  subtotal!: number;
}

// ---------------------------------------------------------------------------
// Respostas
// ---------------------------------------------------------------------------

/** Formato usado nas listagens e nos endpoints aninhados. */
export class OrdemServicoResumoDto {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ enum: StatusOrdemServico, example: StatusOrdemServico.ABERTA })
  status!: StatusOrdemServico;

  @ApiProperty({ example: '2026-09-20T12:00:00.000Z' })
  dataAbertura!: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  dataConclusao!: Date | null;

  @ApiProperty({ example: 379.8, type: Number })
  valorTotal!: number;

  @ApiProperty({ type: VeiculoDaOrdemResumoDto })
  veiculo!: VeiculoDaOrdemResumoDto;

  @ApiPropertyOptional({
    type: MecanicoDaOrdemResumoDto,
    nullable: true,
    description: 'null enquanto a ordem nao tiver mecanico atribuido.',
  })
  mecanico!: MecanicoDaOrdemResumoDto | null;
}

/** Formato completo, devolvido no detalhe e nas escritas. */
export class OrdemServicoDetalheDto {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ enum: StatusOrdemServico, example: StatusOrdemServico.ABERTA })
  status!: StatusOrdemServico;

  @ApiProperty({ example: 'Barulho no motor ao acelerar em subida.' })
  descricaoProblema!: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  observacoes!: string | null;

  @ApiProperty({ example: '2026-09-20T12:00:00.000Z' })
  dataAbertura!: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  dataConclusao!: Date | null;

  @ApiProperty({ example: 379.8, type: Number })
  valorTotal!: number;

  @ApiProperty({ type: VeiculoDaOrdemDto })
  veiculo!: VeiculoDaOrdemDto;

  @ApiPropertyOptional({ type: MecanicoDaOrdemDto, nullable: true })
  mecanico!: MecanicoDaOrdemDto | null;

  @ApiProperty({ type: [ItemDaOrdemRespostaDto] })
  itens!: ItemDaOrdemRespostaDto[];

  @ApiProperty({ example: '2026-09-20T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-20T12:00:00.000Z' })
  updatedAt!: Date;
}
