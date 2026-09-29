import { ApiProperty } from '@nestjs/swagger';

/** Dados do usuario autenticado. Nunca inclui senhaHash. */
export class UsuarioRespostaDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Administrador da Oficina' })
  nome!: string;

  @ApiProperty({ example: 'admin@oficina.com' })
  email!: string;
}
