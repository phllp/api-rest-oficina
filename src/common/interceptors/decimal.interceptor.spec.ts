import { Prisma } from '@prisma/client';
import { lastValueFrom, of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import {
  converterDecimais,
  DecimalInterceptor,
} from './decimal.interceptor.js';

/** Executa o interceptor sobre um valor e devolve a resposta transformada. */
async function interceptar(valor: unknown): Promise<unknown> {
  const interceptor = new DecimalInterceptor();
  const proximo: CallHandler = { handle: () => of(valor) };

  return lastValueFrom(interceptor.intercept({} as ExecutionContext, proximo));
}

describe('converterDecimais', () => {
  it('converte Decimal em number', () => {
    expect(converterDecimais(new Prisma.Decimal('189.90'))).toBe(189.9);
  });

  it('converte Decimal aninhado em objeto e array', () => {
    const entrada = {
      id: 1,
      valorTotal: new Prisma.Decimal('509.40'),
      itens: [
        { id: 1, precoUnitario: new Prisma.Decimal('189.90'), quantidade: 1 },
        { id: 2, precoUnitario: new Prisma.Decimal('159.75'), quantidade: 2 },
      ],
    };

    expect(converterDecimais(entrada)).toEqual({
      id: 1,
      valorTotal: 509.4,
      itens: [
        { id: 1, precoUnitario: 189.9, quantidade: 1 },
        { id: 2, precoUnitario: 159.75, quantidade: 2 },
      ],
    });
  });

  it('preserva Date sem transformar', () => {
    const data = new Date('2026-01-31T12:00:00.000Z');

    expect(converterDecimais({ dataAbertura: data })).toEqual({
      dataAbertura: data,
    });
    expect((converterDecimais(data) as Date).toISOString()).toBe(
      '2026-01-31T12:00:00.000Z',
    );
  });

  it.each([null, undefined])('preserva %j', (valor) => {
    expect(converterDecimais(valor)).toBe(valor);
  });

  it('preserva tipos primitivos e campos nulos', () => {
    expect(
      converterDecimais({ nome: 'Ana', ativo: true, cor: null, ano: 2021 }),
    ).toEqual({ nome: 'Ana', ativo: true, cor: null, ano: 2021 });
  });

  it('percorre arrays na raiz', () => {
    expect(converterDecimais([new Prisma.Decimal('50.00'), 2])).toEqual([
      50, 2,
    ]);
  });
});

describe('DecimalInterceptor', () => {
  it('transforma a resposta do handler', async () => {
    await expect(
      interceptar({ preco: new Prisma.Decimal('320.50') }),
    ).resolves.toEqual({ preco: 320.5 });
  });

  it('nao quebra com resposta vazia (204)', async () => {
    await expect(interceptar(undefined)).resolves.toBeUndefined();
  });
});
