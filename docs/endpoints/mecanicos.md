# Endpoints — Mecânicos

Recurso dos mecânicos da oficina. Todas as respostas de erro seguem o padrão
descrito em [`../erros.md`](../erros.md). Os exemplos usam os dados do seed
(`npm run db:seed`).

| Método | URL               | Objetivo resumido                         |
| ------ | ----------------- | ----------------------------------------- |
| GET    | `/mecanicos`      | Lista paginada com filtros                |
| GET    | `/mecanicos/{id}` | Detalhe com o total de ordens vinculadas  |
| POST   | `/mecanicos`      | Cadastra um mecânico                      |
| PUT    | `/mecanicos/{id}` | Substitui os dados de um mecânico         |
| DELETE | `/mecanicos/{id}` | Exclui um mecânico                        |

> `GET /mecanicos/{id}/ordens-servico` será documentado na etapa de Ordens de Serviço.

**Regra de negócio importante:** mecânicos com ordens de serviço no histórico
**não podem ser excluídos**. Para tirá-los de circulação, altere `ativo` para
`false` — eles continuam ligados às ordens antigas, mas não devem receber novas.

---

### GET /mecanicos

**Objetivo:** listar os mecânicos cadastrados, de forma paginada e ordenada por nome, com filtros opcionais.

**Parâmetros de rota / consulta:**

| Nome            | Tipo    | Obrigatório | Finalidade                                                                    |
| --------------- | ------- | ----------- | ----------------------------------------------------------------------------- |
| `nome`          | string  | não         | Busca parcial pelo nome, sem diferenciar maiúsculas de minúsculas             |
| `especialidade` | string  | não         | Busca parcial pela especialidade, sem diferenciar maiúsculas de minúsculas    |
| `ativo`         | boolean | não         | Filtra somente ativos (`true`) ou somente inativos (`false`); aceita **apenas** `true` ou `false` |
| `page`          | integer | não         | Página desejada, começando em 1 (padrão `1`)                                  |
| `limit`         | integer | não         | Registros por página, de 1 a 100 (padrão `10`)                                |

**JSON enviado:** Não possui corpo.

**Resposta de sucesso:** `200 OK`

```json
{
  "page": 1,
  "limit": 10,
  "total": 5,
  "data": [
    {
      "id": 1,
      "nome": "Adilson Moita",
      "especialidade": "Motor e injecao eletronica",
      "telefone": "4733441001",
      "ativo": true,
      "createdAt": "2026-09-28T22:52:10.612Z",
      "updatedAt": "2026-09-28T22:52:10.612Z"
    }
  ]
}
```

Uma página além do total devolve `200` com `"data": []` e o `total` real.

**Respostas de erro:**

| HTTP | Código de erro    | Quando ocorre                                                             |
| ---- | ----------------- | ------------------------------------------------------------------------- |
| 400  | `DADOS_INVALIDOS` | `page`/`limit` fora da faixa, `ativo` diferente de `true`/`false`, ou query param não reconhecido |

---

### GET /mecanicos/{id}

**Objetivo:** obter os dados de um mecânico junto com a quantidade de ordens de serviço vinculadas — útil para saber, antes de tentar, se ele pode ser excluído.

**Parâmetros de rota / consulta:**

| Nome | Tipo    | Obrigatório | Finalidade                      |
| ---- | ------- | ----------- | ------------------------------- |
| `id` | integer | sim (rota)  | Id do mecânico a ser consultado |

**JSON enviado:** Não possui corpo.

**Resposta de sucesso:** `200 OK`

```json
{
  "id": 1,
  "nome": "Adilson Moita",
  "especialidade": "Motor e injecao eletronica",
  "telefone": "4733441001",
  "ativo": true,
  "createdAt": "2026-09-28T22:52:10.612Z",
  "updatedAt": "2026-09-28T22:52:10.612Z",
  "totalOrdensServico": 6
}
```

**Respostas de erro:**

| HTTP | Código de erro           | Quando ocorre                          |
| ---- | ------------------------ | -------------------------------------- |
| 400  | `DADOS_INVALIDOS`        | `id` não é um número inteiro positivo  |
| 404  | `RECURSO_NAO_ENCONTRADO` | Não existe mecânico com o id informado |

---

### POST /mecanicos

**Objetivo:** cadastrar um mecânico.

**Parâmetros de rota / consulta:** Não possui.

**JSON enviado:**

```json
{
  "nome": "Rafaela Duarte",
  "especialidade": "Ar-condicionado automotivo",
  "telefone": "(47) 3344-1006"
}
```

Regras de entrada: `nome` de 2 a 120 caracteres; `especialidade` de 2 a 80;
`telefone` com 10 ou 11 dígitos, aceito com máscara e **armazenado somente com
dígitos**; `ativo` é **opcional** e assume `true` quando omitido.

**Resposta de sucesso:** `201 Created`

```json
{
  "id": 6,
  "nome": "Rafaela Duarte",
  "especialidade": "Ar-condicionado automotivo",
  "telefone": "4733441006",
  "ativo": true,
  "createdAt": "2026-09-28T23:40:00.000Z",
  "updatedAt": "2026-09-28T23:40:00.000Z"
}
```

**Respostas de erro:**

| HTTP | Código de erro    | Quando ocorre                                                        |
| ---- | ----------------- | -------------------------------------------------------------------- |
| 400  | `DADOS_INVALIDOS` | Campo obrigatório ausente, fora do tamanho, telefone inválido, `ativo` diferente de `true`/`false`, ou campo não declarado no DTO |
| 400  | `JSON_INVALIDO`   | O corpo enviado não é um JSON válido                                 |

---

### PUT /mecanicos/{id}

**Objetivo:** substituir por completo os dados de um mecânico. É também a forma recomendada de **desativar** um mecânico com histórico (`"ativo": false`).

**Parâmetros de rota / consulta:**

| Nome | Tipo    | Obrigatório | Finalidade                     |
| ---- | ------- | ----------- | ------------------------------ |
| `id` | integer | sim (rota)  | Id do mecânico a ser atualizado |

**JSON enviado:**

```json
{
  "nome": "Adilson Moita",
  "especialidade": "Motor, injecao eletronica e cambio",
  "telefone": "4733441001",
  "ativo": true
}
```

Como é substituição completa, **`ativo` é obrigatório aqui** (diferente do POST) — assim ninguém reativa um mecânico sem perceber ao omitir o campo.

**Resposta de sucesso:** `200 OK`

```json
{
  "id": 1,
  "nome": "Adilson Moita",
  "especialidade": "Motor, injecao eletronica e cambio",
  "telefone": "4733441001",
  "ativo": true,
  "createdAt": "2026-09-28T22:52:10.612Z",
  "updatedAt": "2026-09-28T23:45:30.120Z"
}
```

**Respostas de erro:**

| HTTP | Código de erro           | Quando ocorre                                       |
| ---- | ------------------------ | --------------------------------------------------- |
| 400  | `DADOS_INVALIDOS`        | `id` inválido, payload incompleto (inclusive `ativo` ausente) ou inválido |
| 400  | `JSON_INVALIDO`          | O corpo enviado não é um JSON válido                 |
| 404  | `RECURSO_NAO_ENCONTRADO` | Não existe mecânico com o id informado               |

---

### DELETE /mecanicos/{id}

**Objetivo:** excluir um mecânico. Só é possível excluir quem **nunca** foi vinculado a uma ordem de serviço (FK com `Restrict`, ver [`../modelo-dados.md`](../modelo-dados.md)).

**Parâmetros de rota / consulta:**

| Nome | Tipo    | Obrigatório | Finalidade                    |
| ---- | ------- | ----------- | ----------------------------- |
| `id` | integer | sim (rota)  | Id do mecânico a ser excluído |

**JSON enviado:** Não possui corpo.

**Resposta de sucesso:** `204 No Content` — sem corpo.

**Respostas de erro:**

| HTTP | Código de erro           | Quando ocorre                                                    |
| ---- | ------------------------ | ---------------------------------------------------------------- |
| 400  | `DADOS_INVALIDOS`        | `id` não é um número inteiro positivo                            |
| 404  | `RECURSO_NAO_ENCONTRADO` | Não existe mecânico com o id informado                           |
| 409  | `RECURSO_EM_USO`         | O mecânico tem ordens vinculadas — a mensagem informa a quantidade e orienta a desativação |

```json
{
  "status": 409,
  "erro": "RECURSO_EM_USO",
  "mensagem": "O mecânico possui 6 ordem(ns) de serviço vinculada(s) e não pode ser excluído. Para removê-lo das novas ordens, altere o campo ativo para false."
}
```
