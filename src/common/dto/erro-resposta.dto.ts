import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Um problema especifico encontrado na validacao do corpo da requisicao. */
export class DetalheErroDto {
  @ApiProperty({
    example: 'email',
    description:
      'Campo que falhou na validacao. Campos aninhados usam notacao de ponto, como "itens.0.quantidade".',
  })
  campo!: string;

  @ApiProperty({
    example: 'email deve ser um e-mail válido',
    description: 'Descricao do problema encontrado no campo.',
  })
  mensagem!: string;
}

/** Formato unico de resposta de erro da API. */
export class ErroRespostaDto {
  @ApiProperty({ example: 404, description: 'Status HTTP da resposta.' })
  status!: number;

  @ApiProperty({
    example: 'RECURSO_NAO_ENCONTRADO',
    description: 'Codigo estavel do erro, em MAIUSCULAS.',
  })
  erro!: string;

  @ApiProperty({
    example: 'Cliente com id 99 não encontrado.',
    description: 'Mensagem explicativa em portugues.',
  })
  mensagem!: string;

  @ApiPropertyOptional({
    type: [DetalheErroDto],
    description: 'Presente apenas em erros de validacao (400).',
  })
  detalhes?: DetalheErroDto[];
}
