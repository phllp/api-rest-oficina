import { validate } from 'class-validator';
import { MenorOuIgualAoCampo } from './menor-ou-igual-ao-campo.validator.js';

class FaixaDePreco {
  @MenorOuIgualAoCampo('preco_max')
  preco_min?: number;

  preco_max?: number;
}

/** Valida uma instancia com a faixa informada e devolve as mensagens. */
async function mensagens(
  preco_min?: number,
  preco_max?: number,
): Promise<string[]> {
  const faixa = new FaixaDePreco();
  faixa.preco_min = preco_min;
  faixa.preco_max = preco_max;

  const erros = await validate(faixa);

  return erros.flatMap((erro) => Object.values(erro.constraints ?? {}));
}

describe('@MenorOuIgualAoCampo', () => {
  it('aceita faixa em ordem crescente', async () => {
    await expect(mensagens(100, 500)).resolves.toEqual([]);
  });

  it('aceita os extremos iguais', async () => {
    await expect(mensagens(500, 500)).resolves.toEqual([]);
  });

  it('rejeita minimo maior que o maximo com mensagem explicativa', async () => {
    await expect(mensagens(500, 100)).resolves.toEqual([
      'preco_min não pode ser maior que preco_max',
    ]);
  });

  it('ignora a validacao quando so um extremo e informado', async () => {
    await expect(mensagens(500, undefined)).resolves.toEqual([]);
    await expect(mensagens(undefined, 100)).resolves.toEqual([]);
    await expect(mensagens(undefined, undefined)).resolves.toEqual([]);
  });
});
