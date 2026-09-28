import { CriarClienteDto } from './criar-cliente.dto.js';

/**
 * PUT e substituicao completa do recurso: todos os campos continuam
 * obrigatorios, entao o DTO de atualizacao reaproveita o de criacao.
 */
export class AtualizarClienteDto extends CriarClienteDto {}
