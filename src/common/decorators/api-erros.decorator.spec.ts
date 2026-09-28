import { ApiErros } from './api-erros.decorator.js';
import { CodigosErro } from '../errors/codigos-erro.js';

/** Le os metadados de resposta que o decorator registrou no metodo. */
function respostasDocumentadas(
  ...erros: Parameters<typeof ApiErros>
): Record<string, { description?: string }> {
  class Controller {
    metodo(): void {}
  }

  const descritor = Object.getOwnPropertyDescriptor(
    Controller.prototype,
    'metodo',
  ) as TypedPropertyDescriptor<() => void>;

  ApiErros(...erros)(Controller.prototype, 'metodo', descritor);

  const metadados: unknown = Reflect.getMetadata(
    'swagger/apiResponse',
    descritor.value as object,
  );

  return (metadados ?? {}) as Record<string, { description?: string }>;
}

describe('ApiErros', () => {
  it('usa o codigo padrao de cada status informado', () => {
    const respostas = respostasDocumentadas(400, 404);

    expect(Object.keys(respostas).sort()).toEqual(['400', '404']);
    expect(respostas['400'].description).toContain('DADOS_INVALIDOS');
    expect(respostas['404'].description).toContain('RECURSO_NAO_ENCONTRADO');
  });

  it('respeita o codigo especifico informado, com o status correspondente', () => {
    const respostas = respostasDocumentadas(CodigosErro.RECURSO_EM_USO);

    expect(Object.keys(respostas)).toEqual(['409']);
    expect(respostas['409'].description).toContain('RECURSO_EM_USO');
    expect(respostas['409'].description).not.toContain('REGISTRO_DUPLICADO');
  });

  it('reune descricoes de codigos que compartilham o mesmo status', () => {
    const respostas = respostasDocumentadas(
      CodigosErro.REGISTRO_DUPLICADO,
      CodigosErro.RECURSO_EM_USO,
    );

    expect(Object.keys(respostas)).toEqual(['409']);
    expect(respostas['409'].description).toContain('REGISTRO_DUPLICADO');
    expect(respostas['409'].description).toContain('RECURSO_EM_USO');
  });
});
