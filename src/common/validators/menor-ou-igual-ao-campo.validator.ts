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
 * anotado nao seja maior que o outro (ex.: `preco_min` x `preco_max`).
 *
 * A validacao e ignorada quando um dos dois nao foi informado -- filtrar
 * apenas por um extremo da faixa e valido.
 *
 * ```ts
 * @MenorOuIgualAoCampo('preco_max')
 * preco_min?: number;
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

          if (typeof valor !== 'number' || typeof limite !== 'number') {
            return true;
          }

          return valor <= limite;
        },
        defaultMessage: (argumentos?: ValidationArguments) =>
          `${String(argumentos?.property)} não pode ser maior que ${campoLimite}`,
      },
    });
  };
}
