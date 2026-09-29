# Endpoints — Clientes

Recurso de clientes da oficina. Todas as respostas de erro seguem o padrão
descrito em [`../erros.md`](../erros.md). Os exemplos usam os dados do seed
(`npm run db:seed`).

> **Requer autenticação:** todas as rotas desta página exigem o header
> `Authorization: Bearer <token>`. Veja [`../autenticacao.md`](../autenticacao.md)
> para obter o token.

| Método | URL                      | Objetivo resumido                  |
| ------ | ------------------------ | ---------------------------------- |
| GET    | `/clientes`              | Lista paginada com filtros         |
| GET    | `/clientes/{id}`         | Detalhe do cliente com seus veículos |
| GET    | `/clientes/{id}/veiculos`| Veículos do cliente (sem paginação) |
| POST   | `/clientes`              | Cadastra um cliente                |
| PUT    | `/clientes/{id}`         | Substitui os dados de um cliente   |
| DELETE | `/clientes/{id}`         | Exclui um cliente                  |
| GET    | `/clientes/{id}/ordens-servico` | Ordens de serviço de todos os veículos do cliente |

---

### GET /clientes

**Objetivo:** listar os clientes cadastrados, de forma paginada e ordenada por nome, com filtros opcionais.

**Parâmetros de rota / consulta:**

| Nome    | Tipo    | Obrigatório | Finalidade                                                                 |
| ------- | ------- | ----------- | -------------------------------------------------------------------------- |
| `nome`  | string  | não         | Busca parcial pelo nome, sem diferenciar maiúsculas de minúsculas          |
| `cpf`   | string  | não         | Busca exata pelo CPF; aceita com ou sem máscara (`529.982.247-25`)         |
| `email` | string  | não         | Busca parcial pelo e-mail, sem diferenciar maiúsculas de minúsculas        |
| `page`  | integer | não         | Página desejada, começando em 1 (padrão `1`)                               |
| `limit` | integer | não         | Registros por página, de 1 a 100 (padrão `10`)                             |

**JSON enviado:** Não possui corpo.

**Resposta de sucesso:** `200 OK`

```json
{
  "page": 2,
  "limit": 10,
  "total": 25,
  "data": [
    {
      "id": 11,
      "nome": "Karina Lopes Teixeira",
      "cpf": "90123456780",
      "email": "karina.11@email.com",
      "telefone": "47992212233",
      "createdAt": "2026-09-28T22:52:10.512Z",
      "updatedAt": "2026-09-28T22:52:10.512Z"
    }
  ]
}
```

Uma página além do total devolve `200` com `"data": []` e o `total` real.

**Respostas de erro:**

| HTTP | Código de erro    | Quando ocorre                                                       |
| ---- | ----------------- | ------------------------------------------------------------------- |
| 400  | `DADOS_INVALIDOS` | `page` < 1, `limit` fora de 1–100, valores não numéricos ou query param não reconhecido |

---

### GET /clientes/{id}

**Objetivo:** obter os dados de um cliente junto com a lista resumida dos seus veículos.

**Parâmetros de rota / consulta:**

| Nome | Tipo    | Obrigatório | Finalidade                     |
| ---- | ------- | ----------- | ------------------------------ |
| `id` | integer | sim (rota)  | Id do cliente a ser consultado |

**JSON enviado:** Não possui corpo.

**Resposta de sucesso:** `200 OK`

```json
{
  "id": 3,
  "nome": "Carla Menezes Duarte",
  "cpf": "11144477735",
  "email": "carla.3@email.com",
  "telefone": "47993034455",
  "createdAt": "2026-09-28T22:52:10.512Z",
  "updatedAt": "2026-09-28T22:52:10.512Z",
  "veiculos": [
    { "id": 1, "placa": "ABC1234", "marca": "Fiat", "modelo": "Argo Drive 1.0" },
    { "id": 3, "placa": "JKL9A21", "marca": "Volkswagen", "modelo": "Gol 1.6" },
    { "id": 2, "placa": "RDF5G78", "marca": "Chevrolet", "modelo": "Onix LT 1.0" }
  ]
}
```

**Respostas de erro:**

| HTTP | Código de erro           | Quando ocorre                                  |
| ---- | ------------------------ | ---------------------------------------------- |
| 400  | `DADOS_INVALIDOS`        | `id` não é um número inteiro positivo          |
| 404  | `RECURSO_NAO_ENCONTRADO` | Não existe cliente com o id informado          |

---

### GET /clientes/{id}/veiculos

**Objetivo:** listar os veículos de um cliente (relacionamento Cliente 1:N Veículo). Devolve um array simples, sem paginação, ordenado por placa.

**Parâmetros de rota / consulta:**

| Nome | Tipo    | Obrigatório | Finalidade                                  |
| ---- | ------- | ----------- | ------------------------------------------- |
| `id` | integer | sim (rota)  | Id do cliente cujos veículos serão listados |

**JSON enviado:** Não possui corpo.

**Resposta de sucesso:** `200 OK`

```json
[
  {
    "id": 1,
    "placa": "ABC1234",
    "marca": "Fiat",
    "modelo": "Argo Drive 1.0",
    "ano": 2021,
    "cor": "Branco"
  },
  {
    "id": 3,
    "placa": "JKL9A21",
    "marca": "Volkswagen",
    "modelo": "Gol 1.6",
    "ano": 2016,
    "cor": "Cinza"
  }
]
```

Cliente sem veículos devolve `200` com `[]`.

**Respostas de erro:**

| HTTP | Código de erro           | Quando ocorre                         |
| ---- | ------------------------ | ------------------------------------- |
| 400  | `DADOS_INVALIDOS`        | `id` não é um número inteiro positivo |
| 404  | `RECURSO_NAO_ENCONTRADO` | Não existe cliente com o id informado |

---

### POST /clientes

**Objetivo:** cadastrar um novo cliente.

**Parâmetros de rota / consulta:** Não possui.

**JSON enviado:**

```json
{
  "nome": "Joana Ferreira Martins",
  "cpf": "842.853.790-38",
  "email": "Joana.Martins@Email.com",
  "telefone": "(47) 99555-1234"
}
```

Regras de entrada: `nome` de 2 a 120 caracteres (espaços das pontas removidos);
`cpf` com dígitos verificadores válidos, aceito com ou sem máscara e **armazenado
somente com dígitos**; `email` válido, **armazenado em minúsculas**; `telefone`
com 10 ou 11 dígitos, aceito com máscara e armazenado somente com dígitos.

**Resposta de sucesso:** `201 Created`

```json
{
  "id": 26,
  "nome": "Joana Ferreira Martins",
  "cpf": "84285379038",
  "email": "joana.martins@email.com",
  "telefone": "47995551234",
  "createdAt": "2026-09-28T23:10:00.000Z",
  "updatedAt": "2026-09-28T23:10:00.000Z"
}
```

**Respostas de erro:**

| HTTP | Código de erro       | Quando ocorre                                                       |
| ---- | -------------------- | ------------------------------------------------------------------- |
| 400  | `DADOS_INVALIDOS`    | Campo obrigatório ausente, fora do tamanho, CPF/e-mail/telefone inválidos, ou campo não declarado no DTO |
| 400  | `JSON_INVALIDO`      | O corpo enviado não é um JSON válido                                |
| 409  | `REGISTRO_DUPLICADO` | Já existe cliente com o mesmo CPF (`"Já existe um cliente com este CPF."`) ou com o mesmo e-mail (`"Já existe um cliente com este e-mail."`) |

---

### PUT /clientes/{id}

**Objetivo:** substituir por completo os dados de um cliente. Todos os campos são obrigatórios — não é uma atualização parcial.

**Parâmetros de rota / consulta:**

| Nome | Tipo    | Obrigatório | Finalidade                    |
| ---- | ------- | ----------- | ----------------------------- |
| `id` | integer | sim (rota)  | Id do cliente a ser atualizado |

**JSON enviado:**

```json
{
  "nome": "Ana Paula Ribeiro de Souza",
  "cpf": "52998224725",
  "email": "ana.1@email.com",
  "telefone": "47991012233"
}
```

**Resposta de sucesso:** `200 OK`

```json
{
  "id": 1,
  "nome": "Ana Paula Ribeiro de Souza",
  "cpf": "52998224725",
  "email": "ana.1@email.com",
  "telefone": "47991012233",
  "createdAt": "2026-09-28T22:52:10.512Z",
  "updatedAt": "2026-09-28T23:15:42.100Z"
}
```

Manter o próprio CPF e e-mail é permitido: a verificação de duplicidade ignora o
registro que está sendo atualizado.

**Respostas de erro:**

| HTTP | Código de erro           | Quando ocorre                                          |
| ---- | ------------------------ | ------------------------------------------------------ |
| 400  | `DADOS_INVALIDOS`        | `id` inválido ou payload incompleto/inválido            |
| 400  | `JSON_INVALIDO`          | O corpo enviado não é um JSON válido                    |
| 404  | `RECURSO_NAO_ENCONTRADO` | Não existe cliente com o id informado                   |
| 409  | `REGISTRO_DUPLICADO`     | O CPF ou o e-mail já pertence a **outro** cliente       |

---

### DELETE /clientes/{id}

**Objetivo:** excluir um cliente. Só é possível excluir clientes sem veículos vinculados (FK com `Restrict`, ver [`../modelo-dados.md`](../modelo-dados.md)).

**Parâmetros de rota / consulta:**

| Nome | Tipo    | Obrigatório | Finalidade                  |
| ---- | ------- | ----------- | --------------------------- |
| `id` | integer | sim (rota)  | Id do cliente a ser excluído |

**JSON enviado:** Não possui corpo.

**Resposta de sucesso:** `204 No Content` — sem corpo.

**Respostas de erro:**

| HTTP | Código de erro           | Quando ocorre                                                        |
| ---- | ------------------------ | -------------------------------------------------------------------- |
| 400  | `DADOS_INVALIDOS`        | `id` não é um número inteiro positivo                                |
| 404  | `RECURSO_NAO_ENCONTRADO` | Não existe cliente com o id informado                                |
| 409  | `RECURSO_EM_USO`         | O cliente possui veículos: `"O cliente possui 3 veículo(s) cadastrado(s) e não pode ser excluído."` |

---

### GET /clientes/{id}/ordens-servico

**Objetivo:** reunir as ordens de serviço de **todos os veículos** do cliente, em um array simples, sem paginação, da mais recente para a mais antiga.

**Parâmetros de rota / consulta:**

| Nome     | Tipo    | Obrigatório | Finalidade                                                                               |
| -------- | ------- | ----------- | ---------------------------------------------------------------------------------------- |
| `id`     | integer | sim (rota)  | Id do cliente                                                                            |
| `status` | string  | não         | Um ou mais status separados por vírgula (`ABERTA,EM_ANDAMENTO`); valor fora do enum → 400 |

**JSON enviado:** Não possui corpo.

**Resposta de sucesso:** `200 OK` — array no formato resumido de ordens de serviço.

```json
[
  {
    "id": 18,
    "status": "ABERTA",
    "dataAbertura": "2026-09-04T12:00:00.000Z",
    "dataConclusao": null,
    "valorTotal": 509.4,
    "veiculo": { "id": 1, "placa": "ABC1234", "modelo": "Argo Drive 1.0" },
    "mecanico": null
  },
  {
    "id": 2,
    "status": "CONCLUIDA",
    "dataAbertura": "2026-04-10T12:00:00.000Z",
    "dataConclusao": "2026-04-13T12:00:00.000Z",
    "valorTotal": 800.5,
    "veiculo": { "id": 3, "placa": "JKL9A21", "modelo": "Gol 1.6" },
    "mecanico": { "id": 2, "nome": "Cleber Ramos" }
  }
]
```

Cliente sem veículos, ou com veículos que nunca passaram pela oficina, devolve `200` com `[]`.

**Respostas de erro:**

| HTTP | Código de erro           | Quando ocorre                                       |
| ---- | ------------------------ | --------------------------------------------------- |
| 400  | `DADOS_INVALIDOS`        | `id` não é um inteiro positivo, ou `status` inválido |
| 404  | `RECURSO_NAO_ENCONTRADO` | Não existe cliente com o id informado               |

O detalhe de cada ordem está em [`ordens-servico.md`](./ordens-servico.md).
