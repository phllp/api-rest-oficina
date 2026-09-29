import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { paraMinusculas } from '../../../common/transformers/transformers.js';

export class LoginDto {
  @ApiProperty({
    example: 'admin@oficina.com',
    description: 'E-mail do usuario. Normalizado para minusculas.',
  })
  @Transform(paraMinusculas)
  @IsEmail({}, { message: 'email deve ser um e-mail válido.' })
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'Senha do usuario.',
  })
  @IsString({ message: 'senha deve ser um texto.' })
  @IsNotEmpty({ message: 'senha não pode ficar vazia.' })
  senha!: string;
}
