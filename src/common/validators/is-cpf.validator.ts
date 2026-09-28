import { registerDecorator, type ValidationOptions } from 'class-validator';

/**
 * Valida um CPF com 11 digitos, sem mascara, conferindo os dois digitos
 * verificadores.
 *
 * O algoritmo tambem existe em `prisma/seed.ts`, que precisa *gerar* CPFs
 * validos. A duplicacao e intencional: o seed roda com o type-stripping do
 * Node e nao consegue importar modulos de `src/`.
 */
export function validarCpf(valor: unknown): boolean {
  if (typeof valor !== 'string' || !/^\d{11}$/.test(valor)) {
    return false;
  }

  // Sequencias como 00000000000 passam na conta, mas nao sao CPFs validos.
  if (/^(\d)\1{10}$/.test(valor)) {
    return false;
  }

  const digitos = valor.split('').map(Number);

  const calcularDigito = (quantidade: number): number => {
    const pesoInicial = quantidade + 1;
    const soma = digitos
      .slice(0, quantidade)
      .reduce(
        (total, digito, indice) => total + digito * (pesoInicial - indice),
        0,
      );
    const resto = (soma * 10) % 11;

    return resto >= 10 ? 0 : resto;
  };

  return calcularDigito(9) === digitos[9] && calcularDigito(10) === digitos[10];
}

/** @IsCpf() -- CPF valido com 11 digitos e sem mascara. */
export function IsCpf(opcoes?: ValidationOptions): PropertyDecorator {
  return function (alvo: object, propriedade: string | symbol): void {
    registerDecorator({
      name: 'isCpf',
      target: alvo.constructor,
      propertyName: propriedade as string,
      options: opcoes,
      validator: {
        validate: (valor: unknown) => validarCpf(valor),
        defaultMessage: () =>
          `${String(propriedade)} deve ser um CPF válido com 11 dígitos, sem pontos ou traços`,
      },
    });
  };
}
