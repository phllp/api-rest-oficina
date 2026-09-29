import { OrdemServicoBaseDto } from './ordem-servico-base.dto.js';

/**
 * PUT e substituicao completa dos campos editaveis.
 *
 * `veiculoId` **nao** existe aqui de proposito: o veiculo de uma ordem e
 * imutavel. Envia-lo faz a requisicao falhar com 400 pelo `forbidNonWhitelisted`
 * do ValidationPipe global.
 */
export class AtualizarOrdemServicoDto extends OrdemServicoBaseDto {}
