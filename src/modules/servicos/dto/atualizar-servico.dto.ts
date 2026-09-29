import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';
import { paraBooleano } from '../../../common/transformers/transformers.js';
import { ServicoBaseDto } from './servico-base.dto.js';

/**
 * PUT e substituicao completa: `ativo` e obrigatorio aqui.
 *
 * Alterar o preco nao afeta ordens de servico existentes, porque cada
 * ItemOrdemServico guarda o precoUnitario vigente no momento da inclusao.
 */
export class AtualizarServicoDto extends ServicoBaseDto {
  @ApiProperty({
    example: true,
    description: 'Indica se o servico esta disponivel. Obrigatorio no PUT.',
  })
  @Transform(paraBooleano)
  @IsBoolean({ message: 'ativo deve ser true ou false.' })
  ativo!: boolean;
}
