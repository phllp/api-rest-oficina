import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

/**
 * Garante que um array de objetos nao repita o valor de uma propriedade.
 *
 * ```ts
 * @SemDuplicatasPor('servicoId')
 * itens!: ItemOrdemServicoDto[];
 * ```
 */
export function SemDuplicatasPor(
  propriedadeDoItem: string,
  opcoes?: ValidationOptions,
): PropertyDecorator {
  return function (alvo: object, propriedade: string | symbol): void {
    registerDecorator({
      name: 'semDuplicatasPor',
      target: alvo.constructor,
      propertyName: propriedade as string,
      constraints: [propriedadeDoItem],
      options: opcoes,
      validator: {
        validate: (valor: unknown) => {
          if (!Array.isArray(valor)) {
            return true;
          }

          const valores = valor
            .map((item) =>
              typeof item === 'object' && item !== null
                ? (item as Record<string, unknown>)[propriedadeDoItem]
                : undefined,
            )
            .filter((item) => item !== undefined);

          return new Set(valores).size === valores.length;
        },
        defaultMessage: (argumentos?: ValidationArguments) =>
          `${String(argumentos?.property)} não pode repetir o mesmo ${propriedadeDoItem}`,
      },
    });
  };
}
