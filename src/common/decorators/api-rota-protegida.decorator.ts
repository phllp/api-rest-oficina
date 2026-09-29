import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ErroRespostaDto } from '../dto/erro-resposta.dto.js';
import { CodigosErro, DESCRICOES_ERRO } from '../errors/codigos-erro.js';

/**
 * Marca um controller (ou endpoint) como protegido na documentacao: exibe o
 * cadeado no Swagger e documenta o 401 em **todos** os metodos de uma vez,
 * sem precisar repetir o status em cada `ApiErros`.
 *
 * ```ts
 * @ApiTags('clientes')
 * @ApiRotaProtegida()
 * @Controller('clientes')
 * ```
 */
export function ApiRotaProtegida(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiBearerAuth(),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: `${CodigosErro.NAO_AUTENTICADO} / ${CodigosErro.TOKEN_INVALIDO}: ${DESCRICOES_ERRO.NAO_AUTENTICADO}`,
      type: ErroRespostaDto,
    }),
  );
}
