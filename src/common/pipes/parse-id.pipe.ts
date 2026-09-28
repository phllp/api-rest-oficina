import { Injectable, type PipeTransform } from '@nestjs/common';
import { DadosInvalidosException } from '../errors/api.exception.js';

/**
 * Valida o parametro de rota :id, aceitando apenas inteiros positivos.
 * Uso: `@Param('id', ParseIdPipe) id: number`.
 */
@Injectable()
export class ParseIdPipe implements PipeTransform<unknown, number> {
  transform(valor: unknown): number {
    const texto = typeof valor === 'number' ? String(valor) : valor;

    if (typeof texto !== 'string' || !/^\d+$/.test(texto)) {
      throw this.erro();
    }

    const id = Number(texto);

    if (!Number.isSafeInteger(id) || id < 1) {
      throw this.erro();
    }

    return id;
  }

  private erro(): DadosInvalidosException {
    return new DadosInvalidosException(
      'O parâmetro id deve ser um número inteiro positivo.',
    );
  }
}
