import { validate } from 'class-validator';
import { IsPlaca, validarPlaca } from './is-placa.validator.js';

class VeiculoFake {
  @IsPlaca()
  placa!: string;
}

describe('validarPlaca', () => {
  it.each(['ABC1234', 'XYZ9876'])('aceita a placa antiga %s', (placa) => {
    expect(validarPlaca(placa)).toBe(true);
  });

  it.each(['ABC1D23', 'RDF5G78'])('aceita a placa Mercosul %s', (placa) => {
    expect(validarPlaca(placa)).toBe(true);
  });

  it.each([
    ['abc1234', 'minuscula'],
    ['ABC-1234', 'com hifen'],
    ['ABC 1234', 'com espaco'],
    ['AB1234', 'poucas letras'],
    ['ABCD123', 'letras demais'],
    ['ABC12D3', 'letra na posicao errada'],
    ['ABC1234X', 'longa demais'],
    ['', 'vazia'],
  ])('rejeita %s (%s)', (placa) => {
    expect(validarPlaca(placa)).toBe(false);
  });

  it.each([undefined, null, 1234567])('rejeita o valor %j', (valor) => {
    expect(validarPlaca(valor)).toBe(false);
  });
});

describe('@IsPlaca()', () => {
  it('nao acusa erro para placa valida', async () => {
    const veiculo = new VeiculoFake();
    veiculo.placa = 'ABC1D23';

    await expect(validate(veiculo)).resolves.toHaveLength(0);
  });

  it('acusa erro com mensagem em portugues para placa invalida', async () => {
    const veiculo = new VeiculoFake();
    veiculo.placa = 'ABC-1234';

    const erros = await validate(veiculo);

    expect(erros).toHaveLength(1);
    expect(Object.values(erros[0].constraints ?? {})[0]).toContain(
      'deve ser uma placa válida',
    );
  });
});
