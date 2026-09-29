import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErros } from '../../common/decorators/api-erros.decorator.js';
import { ApiRotaProtegida } from '../../common/decorators/api-rota-protegida.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator.js';
import { CodigosErro } from '../../common/errors/codigos-erro.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginRespostaDto } from './dto/login-resposta.dto.js';
import { UsuarioRespostaDto } from './dto/usuario-resposta.dto.js';
import type { PayloadJwt } from './tipos.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autentica um usuario e devolve o token JWT',
    description:
      'Rota publica. O token devolvido deve ser enviado nas demais chamadas no header Authorization: Bearer <token>.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Autenticado com sucesso.',
    type: LoginRespostaDto,
  })
  @ApiErros(HttpStatus.BAD_REQUEST, CodigosErro.CREDENCIAIS_INVALIDAS)
  login(@Body() dto: LoginDto): Promise<LoginRespostaDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiRotaProtegida()
  @ApiOperation({
    summary: 'Devolve o usuario autenticado',
    description: 'Identifica quem e o dono do token enviado na requisicao.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados do usuario autenticado.',
    type: UsuarioRespostaDto,
  })
  buscarPerfil(
    @UsuarioAtual() usuario: PayloadJwt,
  ): Promise<UsuarioRespostaDto> {
    return this.authService.buscarPerfil(usuario);
  }
}
