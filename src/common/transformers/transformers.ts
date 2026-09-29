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

/**
 * Converte query params booleanos com seguranca: apenas os textos exatos
 * 'true' e 'false' (e booleanos ja tipados) sao convertidos. Qualquer outro
 * valor e devolvido intacto, para que o @IsBoolean() do DTO reprove e a API
 * responda 400 com detalhes.
 *
 * Nunca use `Boolean(valor)` aqui: `Boolean('false')` e `true`.
 */
export function paraBooleano({ value }: TransformFnParams): unknown {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}

/** Remove espacos das pontas de um texto. */
export function paraTextoAparado({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
