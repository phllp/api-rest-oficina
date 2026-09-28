import { HttpException, HttpStatus } from '@nestjs/common';
import type { DetalheErroDto } from '../dto/erro-resposta.dto.js';
import { CodigosErro, type CodigoErroOuTexto } from './codigos-erro.js';

/**
 * Excecao base da API: qualquer erro lancado com ela chega ao cliente no
 * formato { status, erro, mensagem } (mais `detalhes` em erros de validacao).
 */
export class ApiException extends HttpException {
  constructor(
    status: number,
    readonly erro: CodigoErroOuTexto,
    readonly mensagem: string,
    readonly detalhes?: DetalheErroDto[],
  ) {
    super(
      {
        status,
        erro,
        mensagem,
        ...(detalhes && detalhes.length > 0 ? { detalhes } : {}),
      },
      status,
    );
  }
}

/** 404 para um recurso identificado por id. */
export class RecursoNaoEncontradoException extends ApiException {
  constructor(recurso: string, id: number) {
    super(
      HttpStatus.NOT_FOUND,
      CodigosErro.RECURSO_NAO_ENCONTRADO,
      `${recurso} com id ${id} não encontrado.`,
    );
  }
}

/** 409 para violacao de unicidade (CPF, e-mail, placa...). */
export class RegistroDuplicadoException extends ApiException {
  constructor(mensagem: string) {
    super(HttpStatus.CONFLICT, CodigosErro.REGISTRO_DUPLICADO, mensagem);
  }
}

/** 409 para exclusao bloqueada por registros vinculados. */
export class RecursoEmUsoException extends ApiException {
  constructor(mensagem: string) {
    super(HttpStatus.CONFLICT, CodigosErro.RECURSO_EM_USO, mensagem);
  }
}

/** 409 para operacao invalida no estado atual do recurso. */
export class OperacaoNaoPermitidaException extends ApiException {
  constructor(mensagem: string) {
    super(HttpStatus.CONFLICT, CodigosErro.OPERACAO_NAO_PERMITIDA, mensagem);
  }
}

/** 400 para dados invalidos, com os detalhes campo a campo. */
export class DadosInvalidosException extends ApiException {
  constructor(mensagem: string, detalhes?: DetalheErroDto[]) {
    super(
      HttpStatus.BAD_REQUEST,
      CodigosErro.DADOS_INVALIDOS,
      mensagem,
      detalhes,
    );
  }
}
