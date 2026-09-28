import { registerDecorator, type ValidationOptions } from 'class-validator';

/** Padrao antigo: ABC1234. */
const PLACA_ANTIGA = /^[A-Z]{3}\d{4}$/;
/** Padrao Mercosul: ABC1D23. */
const PLACA_MERCOSUL = /^[A-Z]{3}\d[A-Z]\d{2}$/;

/** Valida uma placa em maiusculas, sem hifen nem espacos. */
export function validarPlaca(valor: unknown): boolean {
  if (typeof valor !== 'string') {
    return false;
  }

  return PLACA_ANTIGA.test(valor) || PLACA_MERCOSUL.test(valor);
}

/** @IsPlaca() -- aceita o padrao antigo (ABC1234) e o Mercosul (ABC1D23). */
export function IsPlaca(opcoes?: ValidationOptions): PropertyDecorator {
  return function (alvo: object, propriedade: string | symbol): void {
    registerDecorator({
      name: 'isPlaca',
      target: alvo.constructor,
      propertyName: propriedade as string,
      options: opcoes,
      validator: {
        validate: (valor: unknown) => validarPlaca(valor),
        defaultMessage: () =>
          `${String(propriedade)} deve ser uma placa válida no padrão ABC1234 ou ABC1D23`,
      },
    });
  };
}
