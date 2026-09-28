import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * Documenta uma listagem paginada no Swagger:
 * { page, limit, total, data: Dto[] }.
 *
 * Uso: `@ApiPaginatedResponse(ClienteDto)`.
 */
export function ApiPaginatedResponse<TModelo extends Type<unknown>>(
  modelo: TModelo,
  descricao = 'Lista paginada de registros.',
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiExtraModels(modelo),
    ApiOkResponse({
      description: descricao,
      schema: {
        type: 'object',
        required: ['page', 'limit', 'total', 'data'],
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 25 },
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(modelo) },
          },
        },
      },
    }),
  );
}
