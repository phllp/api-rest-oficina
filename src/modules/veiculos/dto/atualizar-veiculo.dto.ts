import { CriarVeiculoDto } from './criar-veiculo.dto.js';

/**
 * PUT e substituicao completa do recurso: todos os campos continuam
 * obrigatorios. Trocar o `clienteId` e permitido (transferencia de
 * proprietario).
 */
export class AtualizarVeiculoDto extends CriarVeiculoDto {}
