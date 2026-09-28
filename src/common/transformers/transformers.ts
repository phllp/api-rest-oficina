import type { TransformFnParams } from 'class-transformer';

/**
 * Callbacks para usar com @Transform nos DTOs. Todos preservam valores
 * ausentes (undefined/null) e ignoram valores que nao sejam texto, deixando
 * a rejeicao para os validadores.
 */

/** Remove mascara de CPF, CNPJ e telefone: "529.982.247-25" -> "52998224725". */
export function paraSomenteDigitos({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.replace(/\D/g, '') : value;
}

/** Normaliza placa: "abc-1d23" -> "ABC1D23". */
export function paraPlaca({ value }: TransformFnParams): unknown {
  return typeof value === 'string'
    ? value.toUpperCase().replace(/[\s-]/g, '')
    : value;
}

/** Normaliza para minusculas, usado em e-mails. */
export function paraMinusculas({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

/** Remove espacos das pontas de um texto. */
export function paraTextoAparado({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
