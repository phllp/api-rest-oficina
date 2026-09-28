import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { map, type Observable } from 'rxjs';

/**
 * Converte recursivamente os `Prisma.Decimal` da resposta em `number`, para
 * que valores monetarios saiam no JSON como numero e nao como texto.
 *
 * A deteccao usa `Prisma.Decimal.isDecimal`, o utilitario oficial do Prisma.
 */
export function converterDecimais(valor: unknown): unknown {
  if (valor === null || valor === undefined) {
    return valor;
  }

  if (Prisma.Decimal.isDecimal(valor)) {
    return valor.toNumber();
  }

  if (Array.isArray(valor)) {
    return valor.map((item) => converterDecimais(item));
  }

  // Date, Buffer e instancias de classe sao devolvidas intactas.
  if (valor instanceof Date || Buffer.isBuffer(valor)) {
    return valor;
  }

  if (typeof valor === 'object') {
    const prototipo: unknown = Object.getPrototypeOf(valor);

    if (prototipo !== Object.prototype && prototipo !== null) {
      return valor;
    }

    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>).map(([chave, item]) => [
        chave,
        converterDecimais(item),
      ]),
    );
  }

  return valor;
}

@Injectable()
export class DecimalInterceptor implements NestInterceptor {
  intercept(
    _contexto: ExecutionContext,
    proximo: CallHandler,
  ): Observable<unknown> {
    return proximo
      .handle()
      .pipe(map((resposta) => converterDecimais(resposta)));
  }
}
