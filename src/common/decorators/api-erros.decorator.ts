import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErroRespostaDto } from '../dto/erro-resposta.dto.js';
import {
  CODIGO_POR_STATUS,
  CodigosErro,
  DESCRICOES_ERRO,
  STATUS_POR_CODIGO,
  type CodigoErro,
} from '../errors/codigos-erro.js';

/** Aceita um status HTTP (usa o codigo padrao dele) ou um codigo especifico. */
export type ErroDocumentado = number | CodigoErro;

/**
 * Documenta as respostas de erro de um endpoint com o schema padrao da API.
 *
 * Passe o status quando o codigo padrao daquele status serve
 * (`400` -> DADOS_INVALIDOS) e passe o codigo quando o endpoint usa um
 * especifico -- necessario no 409, que pode ser REGISTRO_DUPLICADO,
 * RECURSO_EM_USO ou OPERACAO_NAO_PERMITIDA:
 *
 * ```ts
 * @ApiErros(400, 404, CodigosErro.RECURSO_EM_USO)
 * ```
 *
 * O OpenAPI admite uma unica resposta por status, entao codigos que
 * compartilham o mesmo status tem as descricoes reunidas.
 */
export function ApiErros(
  ...erros: ErroDocumentado[]
): MethodDecorator & ClassDecorator {
  const descricoesPorStatus = new Map<number, string[]>();

  for (const erro of erros) {
    const codigo = resolverCodigo(erro);
    const status = typeof erro === 'number' ? erro : STATUS_POR_CODIGO[codigo];
    const descricoes = descricoesPorStatus.get(status) ?? [];

    descricoes.push(`${codigo}: ${DESCRICOES_ERRO[codigo]}`);
    descricoesPorStatus.set(status, descricoes);
  }

  const respostas = [...descricoesPorStatus.entries()].map(
    ([status, descricoes]) =>
      ApiResponse({
        status,
        description: descricoes.join(' / '),
        type: ErroRespostaDto,
      }),
  );

  return applyDecorators(...respostas);
}

/** Descobre o codigo de erro a partir do status ou do proprio codigo. */
function resolverCodigo(erro: ErroDocumentado): CodigoErro {
  if (typeof erro !== 'number') {
    return erro;
  }

  return CODIGO_POR_STATUS[erro] ?? CodigosErro.ERRO_INTERNO;
}
