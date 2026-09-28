import { validate } from 'class-validator';
import { IsCpf, validarCpf } from './is-cpf.validator.js';

class ClienteFake {
  @IsCpf()
  cpf!: string;
}

describe('validarCpf', () => {
  it.each(['52998224725', '11144477735', '39047371712', '23456789092'])(
    'aceita o CPF valido %s',
    (cpf) => {
      expect(validarCpf(cpf)).toBe(true);
    },
  );

  it.each([
    ['52998224724', 'digito verificador errado'],
    ['00000000000', 'digitos repetidos'],
    ['11111111111', 'digitos repetidos'],
    ['529.982.247-25', 'com mascara'],
    ['5299822472', 'com 10 digitos'],
    ['529982247255', 'com 12 digitos'],
    ['', 'vazio'],
  ])('rejeita %s (%s)', (cpf) => {
    expect(validarCpf(cpf)).toBe(false);
  });

  it.each([undefined, null, 52998224725, {}])('rejeita o valor %j', (valor) => {
    expect(validarCpf(valor)).toBe(false);
  });
});

describe('@IsCpf()', () => {
  it('nao acusa erro para CPF valido', async () => {
    const cliente = new ClienteFake();
    cliente.cpf = '52998224725';

    await expect(validate(cliente)).resolves.toHaveLength(0);
  });

  it('acusa erro com mensagem em portugues para CPF invalido', async () => {
    const cliente = new ClienteFake();
    cliente.cpf = '12345678900';

    const erros = await validate(cliente);

    expect(erros).toHaveLength(1);
    expect(Object.values(erros[0].constraints ?? {})[0]).toContain(
      'deve ser um CPF válido',
    );
  });
});
