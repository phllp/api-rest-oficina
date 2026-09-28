import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErroRespostaDto } from '../dto/erro-resposta.dto.js';
import {
  CODIGO_POR_STATUS,
  CodigosErro,
  DESCRICOES_ERRO,
} from '../errors/codigos-erro.js';

/**
 * Documenta as respostas de erro de um endpoint com o schema padrao
 * da API, evitando repetir @ApiResponse em cada controller.
 *
 * Uso: `@ApiErros(400, 404, 409)`.
 */
export function ApiErros(
  ...status: number[]
): MethodDecorator & ClassDecorator {
  const respostas = status.map((codigoHttp) => {
    const codigo = CODIGO_POR_STATUS[codigoHttp] ?? CodigosErro.ERRO_INTERNO;

    return ApiResponse({
      status: codigoHttp,
      description: `${codigo}: ${DESCRICOES_ERRO[codigo]}`,
      type: ErroRespostaDto,
    });
  });

  return applyDecorators(...respostas);
}
