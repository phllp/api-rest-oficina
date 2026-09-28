# Endpoints — Veículos

Recurso de veículos da oficina. Todas as respostas de erro seguem o padrão
descrito em [`../erros.md`](../erros.md). Os exemplos usam os dados do seed
(`npm run db:seed`).

| Método | URL              | Objetivo resumido                    |
| ------ | ---------------- | ------------------------------------ |
| GET    | `/veiculos`      | Lista paginada com filtros           |
| GET    | `/veiculos/{id}` | Detalhe do veículo com o proprietário |
| POST   | `/veiculos`      | Cadastra um veículo                  |
| PUT    | `/veiculos/{id}` | Substitui os dados de um veículo     |
| DELETE | `/veiculos/{id}` | Exclui um veículo                    |

> `GET /veiculos/{id}/ordens-servico` será documentado na etapa de Ordens de Serviço.

---

### GET /veiculos

**Objetivo:** listar os veículos cadastrados, de forma paginada e ordenada por placa, com filtros opcionais.

**Parâmetros de rota / consulta:**

| Nome         | Tipo    | Obrigatório | Finalidade                                                                          |
| ------------ | ------- | ----------- | ----------------------------------------------------------------------------------- |
| `placa`      | string  | não         | Busca parcial pela placa; o valor é normalizado (maiúsculas, sem hífen) antes da busca, então `abc` e `ABC` funcionam igual |
| `marca`      | string  | não         | Busca parcial pela marca, sem diferenciar maiúsculas de minúsculas                  |
| `modelo`     | string  | não         | Busca parcial pelo modelo, sem diferenciar maiúsculas de minúsculas                 |
| `ano`        | integer | não         | Busca exata pelo ano de fabricação                                                  |
| `cliente_id` | integer | não         | Restringe a listagem aos veículos de um proprietário específico                     |
| `page`       | integer | não         | Página desejada, começando em 1 (padrão `1`)                                        |
| `limit`      | integer | não         | Registros por página, de 1 a 100 (padrão `10`)                                      |

**JSON enviado:** Não possui corpo.

**Resposta de sucesso:** `200 OK`

```json
{
  "page": 1,
  "limit": 10,
  "total": 35,
  "data": [
    {
      "id": 26,
      "placa": "ABD4455",
      "marca": "Toyota",
      "modelo": "Etios X 1.3",
      "ano": 2018,
      "cor": "Prata",
      "clienteId": 18,
      "createdAt": "2026-09-28T22:52:10.712Z",
      "updatedAt": "2026-09-28T22:52:10.712Z"
    }
  ]
}
```

Uma página além do total devolve `200` com `"data": []` e o `total` real.

**Respostas de erro:**

| HTTP | Código de erro    | Quando ocorre                                                             |
| ---- | ----------------- | ------------------------------------------------------------------------- |
| 400  | `DADOS_INVALIDOS` | `page`/`limit` fora da faixa, `ano` ou `cliente_id` não numéricos, ou query param não reconhecido |

---

### GET /veiculos/{id}

**Objetivo:** obter os dados de um veículo junto com o proprietário resumido.

**Parâmetros de rota / consulta:**

| Nome | Tipo    | Obrigatório | Finalidade                     |
| ---- | ------- | ----------- | ------------------------------ |
| `id` | integer | sim (rota)  | Id do veículo a ser consultado |

**JSON enviado:** Não possui corpo.

**Resposta de sucesso:** `200 OK`

```json
{
  "id": 1,
  "placa": "ABC1234",
  "marca": "Fiat",
  "modelo": "Argo Drive 1.0",
  "ano": 2021,
  "cor": "Branco",
  "clienteId": 3,
  "createdAt": "2026-09-28T22:52:10.712Z",
  "updatedAt": "2026-09-28T22:52:10.712Z",
  "cliente": {
    "id": 3,
    "nome": "Carla Menezes Duarte",
    "telefone": "47993034455"
  }
}
```

**Respostas de erro:**

| HTTP | Código de erro           | Quando ocorre                         |
| ---- | ------------------------ | ------------------------------------- |
| 400  | `DADOS_INVALIDOS`        | `id` não é um número inteiro positivo |
| 404  | `RECURSO_NAO_ENCONTRADO` | Não existe veículo com o id informado |

---

### POST /veiculos

**Objetivo:** cadastrar um veículo vinculado a um cliente existente.

**Parâmetros de rota / consulta:** Não possui.

**JSON enviado:**

```json
{
  "placa": "mkq-4b18",
  "marca": "Renault",
  "modelo": "Kwid Zen 1.0",
  "ano": 2024,
  "cor": "Laranja",
  "clienteId": 3
}
```

Regras de entrada: `placa` no padrão antigo (`ABC1234`) ou Mercosul (`ABC1D23`),
aceita em minúsculas e com hífen e **armazenada em maiúsculas sem hífen**;
`marca` de 2 a 50 caracteres; `modelo` de 1 a 80; `ano` inteiro entre 1950 e o
ano atual + 1; `cor` opcional com até 30 caracteres; `clienteId` inteiro positivo
de um cliente existente.

**Resposta de sucesso:** `201 Created`

```json
{
  "id": 36,
  "placa": "MKQ4B18",
  "marca": "Renault",
  "modelo": "Kwid Zen 1.0",
  "ano": 2024,
  "cor": "Laranja",
  "clienteId": 3,
  "createdAt": "2026-09-28T23:20:00.000Z",
  "updatedAt": "2026-09-28T23:20:00.000Z"
}
```

**Respostas de erro:**

| HTTP | Código de erro           | Quando ocorre                                                        |
| ---- | ------------------------ | -------------------------------------------------------------------- |
| 400  | `DADOS_INVALIDOS`        | Campo obrigatório ausente, placa fora dos padrões, ano fora da faixa, ou campo não declarado no DTO |
| 400  | `JSON_INVALIDO`          | O corpo enviado não é um JSON válido                                 |
| 404  | `RECURSO_NAO_ENCONTRADO` | O `clienteId` informado não existe: `"Cliente com id 9999 não encontrado."` |
| 409  | `REGISTRO_DUPLICADO`     | A placa já está cadastrada: `"Já existe um veículo com a placa ABC1D23."` |

---

### PUT /veiculos/{id}

**Objetivo:** substituir por completo os dados de um veículo. Todos os campos são obrigatórios. Alterar o `clienteId` transfere o veículo para outro proprietário.

**Parâmetros de rota / consulta:**

| Nome | Tipo    | Obrigatório | Finalidade                     |
| ---- | ------- | ----------- | ------------------------------ |
| `id` | integer | sim (rota)  | Id do veículo a ser atualizado |

**JSON enviado:**

```json
{
  "placa": "ABC1234",
  "marca": "Fiat",
  "modelo": "Argo Trekking 1.3",
  "ano": 2021,
  "cor": "Cinza",
  "clienteId": 5
}
```

**Resposta de sucesso:** `200 OK`

```json
{
  "id": 1,
  "placa": "ABC1234",
  "marca": "Fiat",
  "modelo": "Argo Trekking 1.3",
  "ano": 2021,
  "cor": "Cinza",
  "clienteId": 5,
  "createdAt": "2026-09-28T22:52:10.712Z",
  "updatedAt": "2026-09-28T23:25:11.900Z"
}
```

Manter a própria placa é permitido: a verificação de duplicidade ignora o
registro que está sendo atualizado.

**Respostas de erro:**

| HTTP | Código de erro           | Quando ocorre                                                  |
| ---- | ------------------------ | -------------------------------------------------------------- |
| 400  | `DADOS_INVALIDOS`        | `id` inválido ou payload incompleto/inválido                    |
| 400  | `JSON_INVALIDO`          | O corpo enviado não é um JSON válido                            |
| 404  | `RECURSO_NAO_ENCONTRADO` | O veículo não existe **ou** o novo `clienteId` não existe        |
| 409  | `REGISTRO_DUPLICADO`     | A placa já pertence a **outro** veículo                         |

---

### DELETE /veiculos/{id}

**Objetivo:** excluir um veículo. Só é possível excluir veículos sem ordens de serviço vinculadas (FK com `Restrict`, ver [`../modelo-dados.md`](../modelo-dados.md)).

**Parâmetros de rota / consulta:**

| Nome | Tipo    | Obrigatório | Finalidade                   |
| ---- | ------- | ----------- | ---------------------------- |
| `id` | integer | sim (rota)  | Id do veículo a ser excluído |

**JSON enviado:** Não possui corpo.

**Resposta de sucesso:** `204 No Content` — sem corpo.

**Respostas de erro:**

| HTTP | Código de erro           | Quando ocorre                                                       |
| ---- | ------------------------ | ------------------------------------------------------------------- |
| 400  | `DADOS_INVALIDOS`        | `id` não é um número inteiro positivo                               |
| 404  | `RECURSO_NAO_ENCONTRADO` | Não existe veículo com o id informado                               |
| 409  | `RECURSO_EM_USO`         | O veículo possui ordens de serviço: `"O veículo possui 2 ordem(ns) de serviço e não pode ser excluído."` |
