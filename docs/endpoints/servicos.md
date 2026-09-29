# Endpoints — Serviços

Catálogo de serviços oferecidos pela oficina. Todas as respostas de erro seguem
o padrão descrito em [`../erros.md`](../erros.md). Os exemplos usam os dados do
seed (`npm run db:seed`).

> **Requer autenticação:** todas as rotas desta página exigem o header
> `Authorization: Bearer <token>`. Veja [`../autenticacao.md`](../autenticacao.md)
> para obter o token.

| Método | URL              | Objetivo resumido                              |
| ------ | ---------------- | ---------------------------------------------- |
| GET    | `/servicos`      | Lista paginada com filtros e ordenação         |
| GET    | `/servicos/{id}` | Detalhe de um serviço                          |
| POST   | `/servicos`      | Cadastra um serviço no catálogo                |
| PUT    | `/servicos/{id}` | Substitui os dados de um serviço               |
| DELETE | `/servicos/{id}` | Exclui um serviço do catálogo                  |

**Duas regras importantes:**

1. `preco` é enviado e devolvido como **`number`** (nunca string), embora seja
   `Decimal(10,2)` no banco.
2. Serviços já lançados em alguma ordem **não podem ser excluídos**. Para
   retirá-los do catálogo, altere `ativo` para `false`.

---

### GET /servicos

**Objetivo:** listar o catálogo de serviços, de forma paginada, com filtros e ordenação configurável.

**Parâmetros de rota / consulta:**

| Nome          | Tipo    | Obrigatório | Finalidade                                                                                     |
| ------------- | ------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `descricao`   | string  | não         | Busca parcial pela descrição, sem diferenciar maiúsculas de minúsculas                         |
| `preco_min`   | number  | não         | Preço mínimo, **inclusivo**. Não pode ser maior que `preco_max`                                 |
| `preco_max`   | number  | não         | Preço máximo, **inclusivo**                                                                     |
| `ativo`       | boolean | não         | Filtra somente ativos (`true`) ou inativos (`false`); aceita **apenas** `true` ou `false`        |
| `ordenar_por` | enum    | não         | Campo da ordenação: `descricao` (padrão), `preco` ou `tempo_estimado`                            |
| `ordem`       | enum    | não         | Sentido da ordenação: `asc` (padrão) ou `desc`                                                  |
| `page`        | integer | não         | Página desejada, começando em 1 (padrão `1`)                                                    |
| `limit`       | integer | não         | Registros por página, de 1 a 100 (padrão `10`)                                                   |

Os empates na ordenação são resolvidos pelo `id`, para que a paginação seja estável.

**JSON enviado:** Não possui corpo.

**Resposta de sucesso:** `200 OK`

Exemplo de `GET /servicos?preco_min=100&preco_max=500&ordenar_por=preco&ordem=desc`:

```json
{
  "page": 1,
  "limit": 10,
  "total": 5,
  "data": [
    {
      "id": 3,
      "descricao": "Revisao do sistema de freios",
      "preco": 480,
      "tempoEstimadoMin": 120,
      "ativo": true,
      "createdAt": "2026-09-28T22:52:10.652Z",
      "updatedAt": "2026-09-28T22:52:10.652Z"
    },
    {
      "id": 5,
      "descricao": "Troca de pastilhas de freio",
      "preco": 320.5,
      "tempoEstimadoMin": 90,
      "ativo": true,
      "createdAt": "2026-09-28T22:52:10.652Z",
      "updatedAt": "2026-09-28T22:52:10.652Z"
    }
  ]
}
```

**Respostas de erro:**

| HTTP | Código de erro    | Quando ocorre                                                                     |
| ---- | ----------------- | --------------------------------------------------------------------------------- |
| 400  | `DADOS_INVALIDOS` | `preco_min` maior que `preco_max`; `ativo` diferente de `true`/`false`; `ordenar_por`/`ordem` fora dos valores aceitos; `page`/`limit` fora da faixa |

```json
{
  "status": 400,
  "erro": "DADOS_INVALIDOS",
  "mensagem": "Os dados enviados são inválidos.",
  "detalhes": [
    { "campo": "preco_min", "mensagem": "preco_min não pode ser maior que preco_max" }
  ]
}
```

---

### GET /servicos/{id}

**Objetivo:** obter os dados de um serviço do catálogo.

**Parâmetros de rota / consulta:**

| Nome | Tipo    | Obrigatório | Finalidade                     |
| ---- | ------- | ----------- | ------------------------------ |
| `id` | integer | sim (rota)  | Id do serviço a ser consultado |

**JSON enviado:** Não possui corpo.

**Resposta de sucesso:** `200 OK`

```json
{
  "id": 1,
  "descricao": "Troca de oleo e filtro",
  "preco": 189.9,
  "tempoEstimadoMin": 45,
  "ativo": true,
  "createdAt": "2026-09-28T22:52:10.652Z",
  "updatedAt": "2026-09-28T22:52:10.652Z"
}
```

**Respostas de erro:**

| HTTP | Código de erro           | Quando ocorre                         |
| ---- | ------------------------ | ------------------------------------- |
| 400  | `DADOS_INVALIDOS`        | `id` não é um número inteiro positivo |
| 404  | `RECURSO_NAO_ENCONTRADO` | Não existe serviço com o id informado |

---

### POST /servicos

**Objetivo:** cadastrar um serviço no catálogo.

**Parâmetros de rota / consulta:** Não possui.

**JSON enviado:**

```json
{
  "descricao": "Troca de amortecedores dianteiros",
  "preco": 1290.9,
  "tempoEstimadoMin": 240
}
```

Regras de entrada: `descricao` de 3 a 150 caracteres (espaços das pontas
removidos); `preco` maior que zero, com no máximo **2 casas decimais** e até
`99999999.99`; `tempoEstimadoMin` inteiro entre 5 e 2880 (48 h); `ativo` é
**opcional** e assume `true` quando omitido.

**Resposta de sucesso:** `201 Created`

```json
{
  "id": 11,
  "descricao": "Troca de amortecedores dianteiros",
  "preco": 1290.9,
  "tempoEstimadoMin": 240,
  "ativo": true,
  "createdAt": "2026-09-28T23:50:00.000Z",
  "updatedAt": "2026-09-28T23:50:00.000Z"
}
```

**Respostas de erro:**

| HTTP | Código de erro       | Quando ocorre                                                                 |
| ---- | -------------------- | ----------------------------------------------------------------------------- |
| 400  | `DADOS_INVALIDOS`    | Campo obrigatório ausente, descrição fora do tamanho, preço zero/negativo ou com 3+ casas decimais, tempo fora da faixa, ou campo não declarado no DTO |
| 400  | `JSON_INVALIDO`      | O corpo enviado não é um JSON válido                                          |
| 409  | `REGISTRO_DUPLICADO` | Já existe serviço com a mesma descrição — a comparação **ignora maiúsculas/minúsculas e espaços nas pontas**, então `"  TROCA DE OLEO E FILTRO "` conflita com `"Troca de oleo e filtro"` |

---

### PUT /servicos/{id}

**Objetivo:** substituir por completo os dados de um serviço. É também a forma de **reajustar o preço** e de **desativar** um serviço com histórico.

**Parâmetros de rota / consulta:**

| Nome | Tipo    | Obrigatório | Finalidade                     |
| ---- | ------- | ----------- | ------------------------------ |
| `id` | integer | sim (rota)  | Id do serviço a ser atualizado |

**JSON enviado:**

```json
{
  "descricao": "Troca de oleo e filtro",
  "preco": 209.9,
  "tempoEstimadoMin": 45,
  "ativo": true
}
```

Como é substituição completa, **`ativo` é obrigatório aqui** (diferente do POST).

> **Reajustar o preço não afeta ordens de serviço já existentes.** Cada
> `ItemOrdemServico` guarda o `precoUnitario` vigente no momento em que o
> serviço foi lançado na ordem, e o `valorTotal` da ordem continua sendo a soma
> daqueles valores — ver [`../modelo-dados.md`](../modelo-dados.md). O preço novo
> vale apenas para os próximos lançamentos.

**Resposta de sucesso:** `200 OK`

```json
{
  "id": 1,
  "descricao": "Troca de oleo e filtro",
  "preco": 209.9,
  "tempoEstimadoMin": 45,
  "ativo": true,
  "createdAt": "2026-09-28T22:52:10.652Z",
  "updatedAt": "2026-09-28T23:55:12.400Z"
}
```

**Respostas de erro:**

| HTTP | Código de erro           | Quando ocorre                                                     |
| ---- | ------------------------ | ----------------------------------------------------------------- |
| 400  | `DADOS_INVALIDOS`        | `id` inválido, payload incompleto (inclusive `ativo` ausente) ou inválido |
| 400  | `JSON_INVALIDO`          | O corpo enviado não é um JSON válido                               |
| 404  | `RECURSO_NAO_ENCONTRADO` | Não existe serviço com o id informado                              |
| 409  | `REGISTRO_DUPLICADO`     | A descrição já pertence a **outro** serviço do catálogo             |

---

### DELETE /servicos/{id}

**Objetivo:** excluir um serviço do catálogo. Só é possível excluir serviços que **nunca** foram lançados em uma ordem (FK com `Restrict`).

**Parâmetros de rota / consulta:**

| Nome | Tipo    | Obrigatório | Finalidade                    |
| ---- | ------- | ----------- | ----------------------------- |
| `id` | integer | sim (rota)  | Id do serviço a ser excluído  |

**JSON enviado:** Não possui corpo.

**Resposta de sucesso:** `204 No Content` — sem corpo.

**Respostas de erro:**

| HTTP | Código de erro           | Quando ocorre                                                     |
| ---- | ------------------------ | ----------------------------------------------------------------- |
| 400  | `DADOS_INVALIDOS`        | `id` não é um número inteiro positivo                             |
| 404  | `RECURSO_NAO_ENCONTRADO` | Não existe serviço com o id informado                             |
| 409  | `RECURSO_EM_USO`         | O serviço está em itens de ordens — a mensagem informa a quantidade e orienta a desativação |

```json
{
  "status": 409,
  "erro": "RECURSO_EM_USO",
  "mensagem": "O serviço está lançado em 9 item(ns) de ordem(ns) de serviço e não pode ser excluído. Para retirá-lo do catálogo, altere o campo ativo para false."
}
```
