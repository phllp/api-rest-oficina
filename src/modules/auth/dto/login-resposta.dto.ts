import { ApiProperty } from '@nestjs/swagger';

export class LoginRespostaDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token JWT a ser enviado no header Authorization.',
  })
  token!: string;

  @ApiProperty({
    example: 'Bearer',
    description: 'Esquema de autenticacao a usar no header.',
  })
  tipo!: string;

  @ApiProperty({
    example: 3600,
    description: 'Validade do token, em segundos.',
  })
  expiraEm!: number;
}
