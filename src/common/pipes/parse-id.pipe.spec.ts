import { ParseIdPipe } from './parse-id.pipe.js';
import { DadosInvalidosException } from '../errors/api.exception.js';

describe('ParseIdPipe', () => {
  const pipe = new ParseIdPipe();

  it.each([
    ['1', 1],
    ['10', 10],
    ['99999', 99999],
  ])('converte "%s" para %i', (entrada, esperado) => {
    expect(pipe.transform(entrada)).toBe(esperado);
  });

  it.each([
    ['0'],
    ['-1'],
    ['1.5'],
    ['abc'],
    ['1a'],
    [' 1'],
    [''],
    ['1e3'],
    ['9007199254740993'],
    [undefined],
    [null],
    [{}],
  ])('rejeita %j', (entrada) => {
    expect(() => pipe.transform(entrada)).toThrow(DadosInvalidosException);
  });

  it('usa o codigo e a mensagem padronizados', () => {
    try {
      pipe.transform('abc');
      expect.unreachable('deveria ter lancado');
    } catch (erro) {
      const excecao = erro as DadosInvalidosException;
      expect(excecao.getStatus()).toBe(400);
      expect(excecao.erro).toBe('DADOS_INVALIDOS');
      expect(excecao.mensagem).toBe(
        'O parâmetro id deve ser um número inteiro positivo.',
      );
    }
  });
});
