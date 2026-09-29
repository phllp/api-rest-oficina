import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

/** Le o valor de outra propriedade do mesmo DTO. */
function valorDoCampo(argumentos: ValidationArguments, campo: string): unknown {
  return (argumentos.object as Record<string, unknown>)[campo];
}

/**
 * Valida uma faixa declarada em dois query params, garantindo que o campo
 * anotado nao seja maior que o outro.
 *
 * Funciona com numeros (`preco_min` x `preco_max`) e com textos -- inclusive
 * datas no formato `YYYY-MM-DD`, cuja ordem lexicografica coincide com a
 * cronologica (`data_inicio` x `data_fim`).
 *
 * A validacao e ignorada quando um dos dois nao foi informado (filtrar por um
 * unico extremo e valido) ou quando os tipos nao coincidem -- nesse caso o
 * proprio @IsNumber/@Matches do campo cuida do erro.
 *
 * ```ts
 * @MenorOuIgualAoCampo('preco_max')
 * preco_min?: number;
 *
 * @MenorOuIgualAoCampo('data_fim')
 * data_inicio?: string;
 * ```
 */
export function MenorOuIgualAoCampo(
  campoLimite: string,
  opcoes?: ValidationOptions,
): PropertyDecorator {
  return function (alvo: object, propriedade: string | symbol): void {
    registerDecorator({
      name: 'menorOuIgualAoCampo',
      target: alvo.constructor,
      propertyName: propriedade as string,
      constraints: [campoLimite],
      options: opcoes,
      validator: {
        validate: (valor: unknown, argumentos?: ValidationArguments) => {
          if (!argumentos) {
            return true;
          }

          const limite = valorDoCampo(argumentos, campoLimite);

          if (typeof valor === 'number' && typeof limite === 'number') {
            return valor <= limite;
          }

          if (typeof valor === 'string' && typeof limite === 'string') {
            return valor <= limite;
          }

          return true;
        },
        defaultMessage: (argumentos?: ValidationArguments) =>
          `${String(argumentos?.property)} não pode ser maior que ${campoLimite}`,
      },
    });
  };
}
