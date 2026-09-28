import type { ValidationError } from 'class-validator';
import type { DetalheErroDto } from '../dto/erro-resposta.dto.js';

export function achatarErrosValidacao(
  erros: ValidationError[],
  caminhoPai = '',
): DetalheErroDto[] {
  return erros.flatMap((erro) => {
    const caminho = caminhoPai
      ? `${caminhoPai}.${erro.property}`
      : erro.property;

    const mensagensDoCampo = Object.values(erro.constraints ?? {}).map(
      (mensagem) => ({ campo: caminho, mensagem }),
    );

    const mensagensDosFilhos = erro.children?.length
      ? achatarErrosValidacao(erro.children, caminho)
      : [];

    return [...mensagensDoCampo, ...mensagensDosFilhos];
  });
}
