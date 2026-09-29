import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  UnauthorizedException,
  type ArgumentsHost,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  extrairCampoDuplicado,
  HttpExceptionFilter,
} from './http-exception.filter.js';
import {
  ApiException,
  RecursoNaoEncontradoException,
} from '../errors/api.exception.js';

interface CorpoCapturado {
  status: number;
  erro: string;
  mensagem: string;
  detalhes?: { campo: string; mensagem: string }[];
}

/** Monta um ArgumentsHost minimo e captura o que o filtro respondeu. */
function criarContexto(metodo = 'GET', url = '/clientes') {
  const capturado: {
    status?: number;
    corpo?: CorpoCapturado;
    headers: Record<string, string>;
  } = { headers: {} };

  const resposta = {
    status(codigo: number) {
      capturado.status = codigo;
      return this;
    },
    json(corpo: CorpoCapturado) {
      capturado.corpo = corpo;
      return this;
    },
    setHeader(nome: string, valor: string) {
      capturado.headers[nome] = valor;
      return this;
    },
  };

  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ method: metodo, url }),
      getResponse: () => resposta,
    }),
  } as unknown as ArgumentsHost;

  return { host, capturado };
}

function erroPrisma(
  code: string,
  meta?: Record<string, unknown>,
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('falha', {
    code,
    clientVersion: '6.19.3',
    meta,
  });
}

describe('HttpExceptionFilter', () => {
  let filtro: HttpExceptionFilter;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    filtro = new HttpExceptionFilter();
    logSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('usa os dados de uma ApiException, incluindo detalhes', () => {
    const { host, capturado } = criarContexto('POST', '/clientes');
    const detalhes = [
      { campo: 'email', mensagem: 'email deve ser um e-mail válido' },
    ];

    filtro.catch(
      new ApiException(
        400,
        'DADOS_INVALIDOS',
        'Os dados enviados são inválidos.',
        detalhes,
      ),
      host,
    );

    expect(capturado.status).toBe(400);
    expect(capturado.corpo).toEqual({
      status: 400,
      erro: 'DADOS_INVALIDOS',
      mensagem: 'Os dados enviados são inválidos.',
      detalhes,
    });
  });

  it('omite detalhes quando a ApiException nao tem nenhum', () => {
    const { host, capturado } = criarContexto();

    filtro.catch(new RecursoNaoEncontradoException('Cliente', 99), host);

    expect(capturado.status).toBe(404);
    expect(capturado.corpo).toEqual({
      status: 404,
      erro: 'RECURSO_NAO_ENCONTRADO',
      mensagem: 'Cliente com id 99 não encontrado.',
    });
    expect(capturado.corpo).not.toHaveProperty('detalhes');
  });

  it('traduz P2002 com target em lista para 409 nomeando o campo', () => {
    const { host, capturado } = criarContexto('POST', '/clientes');

    filtro.catch(
      erroPrisma('P2002', { modelName: 'Cliente', target: ['cpf'] }),
      host,
    );

    expect(capturado.status).toBe(409);
    expect(capturado.corpo).toEqual({
      status: 409,
      erro: 'REGISTRO_DUPLICADO',
      mensagem: 'Já existe um registro com este cpf.',
    });
  });

  it('traduz P2002 com target como nome de constraint', () => {
    const { host, capturado } = criarContexto('POST', '/veiculos');

    filtro.catch(erroPrisma('P2002', { target: 'veiculos_placa_key' }), host);

    expect(capturado.corpo?.mensagem).toBe(
      'Já existe um registro com este placa.',
    );
  });

  it('traduz P2002 sem meta usando mensagem genérica', () => {
    const { host, capturado } = criarContexto('POST', '/clientes');

    filtro.catch(erroPrisma('P2002'), host);

    expect(capturado.status).toBe(409);
    expect(capturado.corpo?.erro).toBe('REGISTRO_DUPLICADO');
    expect(capturado.corpo?.mensagem).toBe(
      'Já existe um registro com os dados informados.',
    );
  });

  it('traduz P2003 para 409 RECURSO_EM_USO', () => {
    const { host, capturado } = criarContexto('DELETE', '/clientes/1');

    filtro.catch(erroPrisma('P2003'), host);

    expect(capturado.status).toBe(409);
    expect(capturado.corpo).toEqual({
      status: 409,
      erro: 'RECURSO_EM_USO',
      mensagem:
        'O registro não pode ser excluído pois possui registros vinculados.',
    });
  });

  it('traduz P2025 para 404', () => {
    const { host, capturado } = criarContexto('PUT', '/clientes/99');

    filtro.catch(erroPrisma('P2025'), host);

    expect(capturado.status).toBe(404);
    expect(capturado.corpo?.erro).toBe('RECURSO_NAO_ENCONTRADO');
  });

  it('traduz codigo Prisma desconhecido para 500 generico e registra no log', () => {
    const { host, capturado } = criarContexto();

    filtro.catch(erroPrisma('P2010'), host);

    expect(capturado.status).toBe(500);
    expect(capturado.corpo).toEqual({
      status: 500,
      erro: 'ERRO_INTERNO',
      mensagem: 'Ocorreu um erro interno no servidor.',
    });
    expect(logSpy).toHaveBeenCalled();
  });

  it('traduz JSON malformado do body-parser para 400 JSON_INVALIDO', () => {
    const { host, capturado } = criarContexto('POST', '/clientes');
    const erro = Object.assign(new SyntaxError('Unexpected token }'), {
      type: 'entity.parse.failed',
      body: '{"nome":}',
      status: 400,
    });

    filtro.catch(erro, host);

    expect(capturado.status).toBe(400);
    expect(capturado.corpo).toEqual({
      status: 400,
      erro: 'JSON_INVALIDO',
      mensagem: 'O corpo da requisição não é um JSON válido.',
    });
  });

  it('traduz SyntaxError com body mesmo sem a propriedade type', () => {
    const { host, capturado } = criarContexto('POST', '/clientes');
    const erro = Object.assign(
      new SyntaxError('Unexpected end of JSON input'),
      {
        body: '{',
      },
    );

    filtro.catch(erro, host);

    expect(capturado.corpo?.erro).toBe('JSON_INVALIDO');
  });

  it.each([
    'Unexpected end of JSON input',
    'Unexpected token \'}\', "{"nome":}" is not valid JSON',
    "Expected property name or '}' in JSON at position 9",
  ])(
    'traduz BadRequestException do adapter com a mensagem %j para JSON_INVALIDO',
    (mensagem) => {
      const { host, capturado } = criarContexto('POST', '/clientes');

      filtro.catch(new BadRequestException(mensagem), host);

      expect(capturado.status).toBe(400);
      expect(capturado.corpo).toEqual({
        status: 400,
        erro: 'JSON_INVALIDO',
        mensagem: 'O corpo da requisição não é um JSON válido.',
      });
    },
  );

  it('nao confunde um 400 comum com JSON invalido', () => {
    const { host, capturado } = criarContexto('POST', '/clientes');

    filtro.catch(new BadRequestException('nome é obrigatório'), host);

    expect(capturado.corpo).toEqual({
      status: 400,
      erro: 'DADOS_INVALIDOS',
      mensagem: 'nome é obrigatório',
    });
  });

  it('traduz 404 de rota inexistente para ROTA_NAO_ENCONTRADA', () => {
    const { host, capturado } = criarContexto('GET', '/xyz');

    filtro.catch(new NotFoundException('Cannot GET /xyz'), host);

    expect(capturado.status).toBe(404);
    expect(capturado.corpo).toEqual({
      status: 404,
      erro: 'ROTA_NAO_ENCONTRADA',
      mensagem: 'Rota GET /xyz não encontrada.',
    });
  });

  it('mantem NotFoundException de negocio como RECURSO_NAO_ENCONTRADO', () => {
    const { host, capturado } = criarContexto('GET', '/clientes/99');

    filtro.catch(new NotFoundException('Cliente não encontrado.'), host);

    expect(capturado.corpo).toEqual({
      status: 404,
      erro: 'RECURSO_NAO_ENCONTRADO',
      mensagem: 'Cliente não encontrado.',
    });
  });

  it('traduz UnauthorizedException para 401 NAO_AUTENTICADO', () => {
    const { host, capturado } = criarContexto('GET', '/clientes');

    filtro.catch(new UnauthorizedException(), host);

    expect(capturado.status).toBe(401);
    expect(capturado.corpo).toEqual({
      status: 401,
      erro: 'NAO_AUTENTICADO',
      mensagem: 'Autenticação necessária para acessar este recurso.',
    });
  });

  it('acrescenta WWW-Authenticate: Bearer em toda resposta 401', () => {
    const { host, capturado } = criarContexto('GET', '/clientes');

    filtro.catch(
      new ApiException(
        401,
        'TOKEN_INVALIDO',
        'Token expirado. Faça login novamente.',
      ),
      host,
    );

    expect(capturado.status).toBe(401);
    expect(capturado.headers['WWW-Authenticate']).toBe('Bearer');
  });

  it('nao envia WWW-Authenticate em respostas que nao sao 401', () => {
    const { host, capturado } = criarContexto('GET', '/clientes');

    filtro.catch(new RecursoNaoEncontradoException('Cliente', 1), host);

    expect(capturado.headers).toEqual({});
  });

  it('mapeia HttpException generica pelo status', () => {
    const { host, capturado } = criarContexto('DELETE', '/clientes/1');

    filtro.catch(new ForbiddenException('Sem permissão.'), host);

    expect(capturado.status).toBe(403);
    expect(capturado.corpo).toEqual({
      status: 403,
      erro: 'OPERACAO_NAO_PERMITIDA',
      mensagem: 'Sem permissão.',
    });
  });

  it('junta as mensagens quando a HttpException traz um array', () => {
    const { host, capturado } = criarContexto('POST', '/clientes');

    filtro.catch(
      new BadRequestException(['nome é obrigatório', 'cpf inválido']),
      host,
    );

    expect(capturado.corpo).toEqual({
      status: 400,
      erro: 'DADOS_INVALIDOS',
      mensagem: 'nome é obrigatório; cpf inválido',
    });
  });

  it('repassa payload que ja esta no padrao da API', () => {
    const { host, capturado } = criarContexto('GET', '/health');

    filtro.catch(
      new HttpException(
        {
          status: 503,
          erro: 'BANCO_INDISPONIVEL',
          mensagem: 'Não foi possível conectar ao banco de dados.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      ),
      host,
    );

    expect(capturado.status).toBe(503);
    expect(capturado.corpo).toEqual({
      status: 503,
      erro: 'BANCO_INDISPONIVEL',
      mensagem: 'Não foi possível conectar ao banco de dados.',
    });
  });

  it('nao vaza detalhes de erro inesperado e registra o stack no log', () => {
    const { host, capturado } = criarContexto('GET', '/clientes');
    const erro = new Error('senha do banco: super-secreta');

    filtro.catch(erro, host);

    expect(capturado.status).toBe(500);
    expect(capturado.corpo).toEqual({
      status: 500,
      erro: 'ERRO_INTERNO',
      mensagem: 'Ocorreu um erro interno no servidor.',
    });
    expect(JSON.stringify(capturado.corpo)).not.toContain('super-secreta');
    expect(JSON.stringify(capturado.corpo)).not.toContain('stack');
    expect(logSpy).toHaveBeenCalledWith(
      'GET /clientes -> 500 ERRO_INTERNO',
      erro.stack,
    );
  });

  it('converte valores lancados que nao sao Error para 500', () => {
    const { host, capturado } = criarContexto();

    filtro.catch('quebrou', host);

    expect(capturado.status).toBe(500);
    expect(capturado.corpo?.erro).toBe('ERRO_INTERNO');
  });

  it('nao registra log de erro para respostas 4xx', () => {
    const { host } = criarContexto();

    filtro.catch(new RecursoNaoEncontradoException('Cliente', 1), host);

    expect(logSpy).not.toHaveBeenCalled();
  });

  describe('extrairCampoDuplicado', () => {
    it.each([
      [{ target: ['cpf'] }, 'cpf'],
      [{ target: ['ordemServicoId', 'servicoId'] }, 'servicoId'],
      [{ target: 'clientes_cpf_key' }, 'cpf'],
      [{ target: 'veiculos_placa_unique' }, 'placa'],
      [{ target: 'cpf' }, 'cpf'],
      [{}, null],
      [undefined, null],
      [{ target: [] }, null],
      [{ target: 42 }, null],
    ])('extrai %j como %s', (meta, esperado) => {
      expect(extrairCampoDuplicado(meta)).toBe(esperado);
    });
  });
});
