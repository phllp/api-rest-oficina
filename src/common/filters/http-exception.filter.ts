import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  UnauthorizedException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import type { DetalheErroDto } from '../dto/erro-resposta.dto.js';
import { ApiException } from '../errors/api.exception.js';
import {
  CODIGO_POR_STATUS,
  CodigosErro,
  type CodigoErroOuTexto,
} from '../errors/codigos-erro.js';

interface CorpoErro {
  status: number;
  erro: CodigoErroOuTexto;
  mensagem: string;
  detalhes?: DetalheErroDto[];
}

/**
 * Todo 401 acompanha o desafio de autenticacao exigido pelo HTTP
 * (RFC 9110, secao 11.6.1): o cliente precisa saber *como* se autenticar.
 */
const DESAFIO_AUTENTICACAO = 'Bearer';

/** Rotas inexistentes chegam do Nest/Express como "Cannot GET /xyz". */
const MENSAGEM_ROTA_INEXISTENTE = /^Cannot\s+[A-Z]+\s/;

/**
 * Assinatura das mensagens de erro do JSON.parse.
 *
 * O adapter do Express no Nest (`mapException`) converte o SyntaxError do
 * body-parser em `BadRequestException(error.message)`, descartando `type` e
 * `body` -- entao, nesse caminho, a mensagem e a unica pista que sobra.
 */
const MENSAGEM_JSON_INVALIDO =
  /^Unexpected (token|end of JSON input|non-whitespace)|is not valid JSON|in JSON at position/;

/**
 * Le o nome do campo duplicado de um erro P2002 de forma defensiva: o `meta`
 * varia conforme a versao do Prisma e o banco -- pode vir como lista de
 * colunas (`['cpf']`), como texto (`'cpf'`) ou como nome da constraint
 * (`'clientes_cpf_key'`), e pode simplesmente nao vir.
 */
export function extrairCampoDuplicado(meta: unknown): string | null {
  if (typeof meta !== 'object' || meta === null) {
    return null;
  }

  const alvo = (meta as { target?: unknown }).target;

  const bruto = Array.isArray(alvo)
    ? alvo.filter((item): item is string => typeof item === 'string').at(-1)
    : typeof alvo === 'string'
      ? alvo
      : undefined;

  if (!bruto) {
    return null;
  }

  // "clientes_cpf_key" / "veiculos_placa_unique" -> "cpf" / "placa"
  const semSufixo = bruto.replace(/_(key|unique|idx)$/, '');
  const partes = semSufixo.split('_');
  const campo = partes.length > 1 ? partes.slice(1).join('_') : semSufixo;

  return campo.length > 0 ? campo : null;
}

/** Identifica o erro do body-parser para JSON malformado. */
function ehJsonMalformado(excecao: unknown): boolean {
  if (typeof excecao !== 'object' || excecao === null) {
    return false;
  }

  const candidato = excecao as { type?: unknown; body?: unknown };

  if (candidato.type === 'entity.parse.failed') {
    return true;
  }

  return excecao instanceof SyntaxError && candidato.body !== undefined;
}

/** Verifica se o payload de uma HttpException ja esta no padrao da API. */
function ehCorpoPadronizado(payload: unknown): payload is CorpoErro {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const candidato = payload as Record<string, unknown>;

  return (
    typeof candidato.erro === 'string' && typeof candidato.mensagem === 'string'
  );
}

/** Extrai uma mensagem legivel do payload de uma HttpException do Nest. */
function extrairMensagem(payload: unknown, padrao: string): string {
  if (typeof payload === 'string') {
    return payload;
  }

  if (typeof payload === 'object' && payload !== null) {
    const mensagem = (payload as { message?: unknown }).message;

    if (typeof mensagem === 'string') {
      return mensagem;
    }

    if (Array.isArray(mensagem)) {
      return mensagem.filter((item) => typeof item === 'string').join('; ');
    }
  }

  return padrao;
}

/**
 * Filtro global: converte qualquer excecao para o formato
 * { status, erro, mensagem, detalhes? }. Nenhum erro sai da API fora
 * desse padrao, e erros inesperados nunca expoem stack ou mensagem interna.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(excecao: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const requisicao = contexto.getRequest<Request>();
    const resposta = contexto.getResponse<Response>();

    const corpo = this.montarCorpo(excecao, requisicao);

    if (corpo.status === HttpStatus.UNAUTHORIZED) {
      resposta.setHeader('WWW-Authenticate', DESAFIO_AUTENTICACAO);
    }

    if (corpo.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${requisicao.method} ${requisicao.url} -> ${corpo.status} ${corpo.erro}`,
        excecao instanceof Error ? excecao.stack : String(excecao),
      );
    }

    resposta.status(corpo.status).json(corpo);
  }

  private montarCorpo(excecao: unknown, requisicao: Request): CorpoErro {
    if (excecao instanceof ApiException) {
      return {
        status: excecao.getStatus(),
        erro: excecao.erro,
        mensagem: excecao.mensagem,
        ...(excecao.detalhes && excecao.detalhes.length > 0
          ? { detalhes: excecao.detalhes }
          : {}),
      };
    }

    if (excecao instanceof Prisma.PrismaClientKnownRequestError) {
      return this.traduzirErroPrisma(excecao);
    }

    if (ehJsonMalformado(excecao)) {
      return {
        status: HttpStatus.BAD_REQUEST,
        erro: CodigosErro.JSON_INVALIDO,
        mensagem: 'O corpo da requisição não é um JSON válido.',
      };
    }

    if (excecao instanceof HttpException) {
      return this.traduzirHttpException(excecao, requisicao);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      erro: CodigosErro.ERRO_INTERNO,
      mensagem: 'Ocorreu um erro interno no servidor.',
    };
  }

  private traduzirErroPrisma(
    excecao: Prisma.PrismaClientKnownRequestError,
  ): CorpoErro {
    switch (excecao.code) {
      case 'P2002': {
        const campo = extrairCampoDuplicado(excecao.meta);

        return {
          status: HttpStatus.CONFLICT,
          erro: CodigosErro.REGISTRO_DUPLICADO,
          mensagem: campo
            ? `Já existe um registro com este ${campo}.`
            : 'Já existe um registro com os dados informados.',
        };
      }

      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          erro: CodigosErro.RECURSO_EM_USO,
          mensagem:
            'O registro não pode ser excluído pois possui registros vinculados.',
        };

      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          erro: CodigosErro.RECURSO_NAO_ENCONTRADO,
          mensagem: 'O recurso informado não foi encontrado.',
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          erro: CodigosErro.ERRO_INTERNO,
          mensagem: 'Ocorreu um erro interno no servidor.',
        };
    }
  }

  private traduzirHttpException(
    excecao: HttpException,
    requisicao: Request,
  ): CorpoErro {
    const status = excecao.getStatus();
    const payload = excecao.getResponse();

    // Excecoes que ja lancam o padrao da API (como o 503 do /health).
    if (ehCorpoPadronizado(payload)) {
      return { ...payload, status };
    }

    const mensagem = extrairMensagem(payload, excecao.message);

    if (
      status === HttpStatus.BAD_REQUEST &&
      MENSAGEM_JSON_INVALIDO.test(mensagem)
    ) {
      return {
        status: HttpStatus.BAD_REQUEST,
        erro: CodigosErro.JSON_INVALIDO,
        mensagem: 'O corpo da requisição não é um JSON válido.',
      };
    }

    if (
      excecao instanceof NotFoundException &&
      MENSAGEM_ROTA_INEXISTENTE.test(mensagem)
    ) {
      return {
        status: HttpStatus.NOT_FOUND,
        erro: CodigosErro.ROTA_NAO_ENCONTRADA,
        mensagem: `Rota ${requisicao.method} ${requisicao.url} não encontrada.`,
      };
    }

    if (excecao instanceof UnauthorizedException) {
      return {
        status: HttpStatus.UNAUTHORIZED,
        erro: CodigosErro.NAO_AUTENTICADO,
        mensagem: 'Autenticação necessária para acessar este recurso.',
      };
    }

    const erro = CODIGO_POR_STATUS[status] ?? CodigosErro.ERRO_INTERNO;

    return {
      status,
      erro,
      mensagem:
        status >= HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Ocorreu um erro interno no servidor.'
          : mensagem,
    };
  }
}
