import { ApiProperty } from '@nestjs/swagger';
import { StatusOrdemServico } from '@prisma/client';
import { IsEnum } from 'class-validator';

const VALORES = Object.values(StatusOrdemServico);

export class AlterarStatusDto {
  @ApiProperty({
    enum: StatusOrdemServico,
    example: StatusOrdemServico.EM_ANDAMENTO,
    description:
      'Novo status da ordem. As transicoes permitidas estao em docs/endpoints/ordens-servico.md.',
  })
  @IsEnum(StatusOrdemServico, {
    message: `status deve ser um destes valores: ${VALORES.join(', ')}.`,
  })
  status!: StatusOrdemServico;
}
