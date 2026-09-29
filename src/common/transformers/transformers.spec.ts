import type { TransformFnParams } from 'class-transformer';
import {
  paraBooleano,
  paraMinusculas,
  paraPlaca,
  paraSomenteDigitos,
  paraTextoAparado,
} from './transformers.js';

/** Monta o parametro que o class-transformer passa ao @Transform. */
function comValor(value: unknown): TransformFnParams {
  return { value } as TransformFnParams;
}

describe('paraSomenteDigitos', () => {
  it.each([
    ['529.982.247-25', '52998224725'],
    ['(47) 99101-2233', '47991012233'],
    ['47991012233', '47991012233'],
  ])('converte %j em %j', (entrada, esperado) => {
    expect(paraSomenteDigitos(comValor(entrada))).toBe(esperado);
  });

  it.each([undefined, null, 42, {}])('preserva o valor %j', (valor) => {
    expect(paraSomenteDigitos(comValor(valor))).toBe(valor);
  });
});

describe('paraPlaca', () => {
  it.each([
    ['abc-1d23', 'ABC1D23'],
    [' abc 1234 ', 'ABC1234'],
    ['ABC1234', 'ABC1234'],
  ])('converte %j em %j', (entrada, esperado) => {
    expect(paraPlaca(comValor(entrada))).toBe(esperado);
  });
});

describe('paraMinusculas', () => {
  it('normaliza e-mail com maiusculas e espacos', () => {
    expect(paraMinusculas(comValor('  ANA@Email.COM '))).toBe('ana@email.com');
  });
});

describe('paraTextoAparado', () => {
  it('remove espacos das pontas', () => {
    expect(paraTextoAparado(comValor('  Ana Paula  '))).toBe('Ana Paula');
  });
});

describe('paraBooleano', () => {
  it.each([
    ['true', true],
    ['false', false],
  ])('converte o texto %j em %j', (entrada, esperado) => {
    expect(paraBooleano(comValor(entrada))).toBe(esperado);
  });

  it.each([true, false])('mantem o booleano %j', (valor) => {
    expect(paraBooleano(comValor(valor))).toBe(valor);
  });

  // Estes valores continuam intactos de proposito: o @IsBoolean() do DTO
  // reprova e a API responde 400, em vez de assumir um valor silenciosamente.
  it.each(['TRUE', 'False', '1', '0', 'sim', 'abc', '', undefined, null, 1])(
    'preserva %j para o validador reprovar',
    (valor) => {
      expect(paraBooleano(comValor(valor))).toBe(valor);
    },
  );

  it('nunca repete o erro de Boolean("false") === true', () => {
    expect(paraBooleano(comValor('false'))).not.toBe(Boolean('false'));
  });
});
