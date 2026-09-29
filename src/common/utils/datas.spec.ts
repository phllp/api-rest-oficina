import { fimDoDiaUtc, inicioDoDiaUtc } from './datas.js';

describe('inicioDoDiaUtc', () => {
  it('devolve o primeiro instante do dia em UTC', () => {
    expect(inicioDoDiaUtc('2026-03-01').toISOString()).toBe(
      '2026-03-01T00:00:00.000Z',
    );
  });
});

describe('fimDoDiaUtc', () => {
  it('devolve o ultimo instante do dia em UTC', () => {
    expect(fimDoDiaUtc('2026-03-31').toISOString()).toBe(
      '2026-03-31T23:59:59.999Z',
    );
  });

  it('inclui um registro gravado no fim do dia', () => {
    const registro = new Date('2026-03-31T23:59:59.000Z');

    expect(registro <= fimDoDiaUtc('2026-03-31')).toBe(true);
  });

  it('exclui o primeiro instante do dia seguinte', () => {
    const registro = new Date('2026-04-01T00:00:00.000Z');

    expect(registro <= fimDoDiaUtc('2026-03-31')).toBe(false);
  });
});

describe('faixa completa', () => {
  it('cobre o dia inteiro quando inicio e fim sao o mesmo dia', () => {
    const inicio = inicioDoDiaUtc('2026-03-15');
    const fim = fimDoDiaUtc('2026-03-15');
    const meioDia = new Date('2026-03-15T12:00:00.000Z');

    expect(meioDia >= inicio && meioDia <= fim).toBe(true);
    expect(fim.getTime() - inicio.getTime()).toBe(86_399_999);
  });
});
