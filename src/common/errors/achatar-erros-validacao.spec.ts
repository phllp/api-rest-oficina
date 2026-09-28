import type { ValidationError } from 'class-validator';
import { achatarErrosValidacao } from './achatar-erros-validacao.js';

describe('achatarErrosValidacao', () => {
  it('achata erros simples', () => {
    const erros: ValidationError[] = [
      {
        property: 'email',
        constraints: { isEmail: 'email deve ser um e-mail válido' },
      },
    ];

    expect(achatarErrosValidacao(erros)).toEqual([
      { campo: 'email', mensagem: 'email deve ser um e-mail válido' },
    ]);
  });

  it('usa notacao de ponto para campos aninhados em arrays', () => {
    const erros: ValidationError[] = [
      {
        property: 'itens',
        children: [
          {
            property: '0',
            children: [
              {
                property: 'quantidade',
                constraints: { min: 'quantidade deve ser maior ou igual a 1' },
              },
            ],
          },
        ],
      },
    ];

    expect(achatarErrosValidacao(erros)).toEqual([
      {
        campo: 'itens.0.quantidade',
        mensagem: 'quantidade deve ser maior ou igual a 1',
      },
    ]);
  });

  it('inclui todas as mensagens de um mesmo campo', () => {
    const erros: ValidationError[] = [
      {
        property: 'cpf',
        constraints: {
          isCpf: 'cpf deve ser um CPF válido',
          isNotEmpty: 'cpf não pode ficar vazio',
        },
      },
    ];

    expect(achatarErrosValidacao(erros)).toHaveLength(2);
  });

  it('ignora nos intermediarios sem constraints', () => {
    const erros: ValidationError[] = [{ property: 'itens', children: [] }];

    expect(achatarErrosValidacao(erros)).toEqual([]);
  });
});
