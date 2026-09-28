import { calcularPaginacao, montarRespostaPaginada } from './paginacao.js';

describe('calcularPaginacao', () => {
  it.each([
    [1, 10, 0, 10],
    [2, 10, 10, 10],
    [3, 10, 20, 10],
    [1, 100, 0, 100],
    [5, 3, 12, 3],
  ])(
    'page %i com limit %i gera skip %i e take %i',
    (page, limit, skip, take) => {
      expect(calcularPaginacao({ page, limit })).toEqual({ skip, take });
    },
  );

  it('normaliza valores invalidos para a primeira pagina', () => {
    expect(calcularPaginacao({ page: 0, limit: 0 })).toEqual({
      skip: 0,
      take: 10,
    });
    expect(calcularPaginacao({ page: Number.NaN, limit: Number.NaN })).toEqual({
      skip: 0,
      take: 10,
    });
  });

  it('trunca valores fracionarios', () => {
    expect(calcularPaginacao({ page: 2.7, limit: 10.9 })).toEqual({
      skip: 10,
      take: 10,
    });
  });
});

describe('montarRespostaPaginada', () => {
  it('monta o envelope na ordem page, limit, total, data', () => {
    const resposta = montarRespostaPaginada([{ id: 1 }], 25, {
      page: 1,
      limit: 10,
    });

    expect(resposta).toEqual({
      page: 1,
      limit: 10,
      total: 25,
      data: [{ id: 1 }],
    });
    expect(Object.keys(resposta)).toEqual(['page', 'limit', 'total', 'data']);
  });

  it('devolve data vazio para pagina alem do total, preservando o total', () => {
    const resposta = montarRespostaPaginada([], 25, { page: 99, limit: 10 });

    expect(resposta).toEqual({ page: 99, limit: 10, total: 25, data: [] });
  });
});
