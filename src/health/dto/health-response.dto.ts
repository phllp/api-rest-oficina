import { ApiProperty } from '@nestjs/swagger';

export class RespostaHealthDto {
  @ApiProperty({
    example: 'ok',
    description: 'Estado geral da API.',
  })
  status!: string;

  @ApiProperty({
    example: 'up',
    description: 'Estado da conexao com o banco de dados.',
  })
  database!: string;
}
