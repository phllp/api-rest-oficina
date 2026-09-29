# Erros da API

Toda resposta de erro desta API — sem exceção — sai no mesmo formato, produzido
pelo filtro global [`src/common/filters/http-exception.filter.ts`](../src/common/filters/http-exception.filter.ts).

## Formato padrão

```json
{
  "status": 404,
  "erro": "RECURSO_NAO_ENCONTRADO",
  "mensagem": "Cliente com id 99 não encontrado."
}
```

| Campo      | Tipo     | Descrição                                                                 |
| ---------- | -------- | ------------------------------------------------------------------------- |
| `status`   | `number` | Status HTTP da resposta, repetido no corpo para facilitar o log do cliente |
| `erro`     | `string` | Código estável em MAIÚSCULAS — é o que o cliente deve tratar em código     |
| `mensagem` | `string` | Texto em português explicando o problema para quem está desenvolvendo      |
| `detalhes` | `array`  | **Somente em erros de validação (400)**: um item por campo inválido        |

O campo `detalhes` usa notação de ponto para campos aninhados, incluindo índices
de array (`itens.0.quantidade`):

```json
{
  "status": 400,
  "erro": "DADOS_INVALIDOS",
  "mensagem": "Os dados enviados são inválidos.",
  "detalhes": [{ "campo": "email", "mensagem": "email deve ser um e-mail válido" }]
}
```

A `mensagem` pode mudar de redação entre versões; o `erro` não. Nunca faça
parsing da mensagem — trate o código.

Toda resposta **401** acompanha o header `WWW-Authenticate: Bearer`, como manda
o HTTP (RFC 9110): é assim que o cliente descobre *como* se autenticar. Detalhes
do fluxo em [`autenticacao.md`](./autenticacao.md).

## Tabela de códigos

| HTTP | Código                   | Quando ocorre                                                                     |
| ---- | ------------------------ | --------------------------------------------------------------------------------- |
| 400  | `DADOS_INVALIDOS`        | Corpo ou query reprovados na validação; `:id` que não é inteiro positivo; campo não declarado no DTO |
| 400  | `JSON_INVALIDO`          | O corpo da requisição não é um JSON sintaticamente válido                         |
| 401  | `NAO_AUTENTICADO`        | Rota protegida acessada sem o header `Authorization`                               |
| 401  | `TOKEN_INVALIDO`         | Header fora do formato `Bearer <token>`, token malformado/adulterado, expirado, ou usuário do token inexistente |
| 401  | `CREDENCIAIS_INVALIDAS`  | E-mail ou senha incorretos em `POST /auth/login`                                   |
| 404  | `RECURSO_NAO_ENCONTRADO` | O id informado não existe (também cobre o `P2025` do Prisma)                       |
| 404  | `ROTA_NAO_ENCONTRADA`    | A URL não corresponde a nenhuma rota da API                                       |
| 409  | `REGISTRO_DUPLICADO`     | Violação de unicidade: CPF, e-mail, placa ou serviço repetido na mesma OS (`P2002`) |
| 409  | `RECURSO_EM_USO`         | Exclusão bloqueada por registros vinculados (`P2003`, FKs com `Restrict`)          |
| 409  | `OPERACAO_NAO_PERMITIDA` | A operação não faz sentido no estado atual do recurso: transição de status inválida, ordem em estado final, mecânico ou serviço inativo |
| 500  | `ERRO_INTERNO`           | Qualquer falha inesperada. A resposta é sempre genérica; o erro completo fica no log do servidor |
| 503  | `BANCO_INDISPONIVEL`     | `GET /health` não conseguiu falar com o PostgreSQL                                |

## Exemplos concretos

### 1. Payload inválido ao cadastrar cliente

`POST /clientes` com `{ "nome": "", "cpf": "12345678900", "email": "ana#email" }`

```json
{
  "status": 400,
  "erro": "DADOS_INVALIDOS",
  "mensagem": "Os dados enviados são inválidos.",
  "detalhes": [
    { "campo": "nome", "mensagem": "nome não pode ficar vazio" },
    { "campo": "cpf", "mensagem": "cpf deve ser um CPF válido com 11 dígitos, sem pontos ou traços" },
    { "campo": "email", "mensagem": "email deve ser um e-mail válido" }
  ]
}
```

### 2. Corpo com JSON malformado

`POST /clientes` com o corpo `{"nome": `

```json
{
  "status": 400,
  "erro": "JSON_INVALIDO",
  "mensagem": "O corpo da requisição não é um JSON válido."
}
```

### 3. Token ausente

`GET /clientes` sem o header `Authorization`

```json
{
  "status": 401,
  "erro": "NAO_AUTENTICADO",
  "mensagem": "Token de autenticação não informado."
}
```

Resposta acompanhada de `WWW-Authenticate: Bearer`.

### 3.1. Header no formato errado

`GET /clientes` com `Authorization: Basic YWRtaW46MTIzNDU2` (ou o token sem o
esquema `Bearer`)

```json
{
  "status": 401,
  "erro": "TOKEN_INVALIDO",
  "mensagem": "Formato do token inválido. Use: Authorization: Bearer <token>."
}
```

### 3.2. Token inválido ou adulterado

`GET /clientes` com um token cuja assinatura não confere

```json
{
  "status": 401,
  "erro": "TOKEN_INVALIDO",
  "mensagem": "Token inválido."
}
```

### 3.3. Token expirado

`GET /clientes` com um token emitido há mais de `JWT_EXPIRES_IN`

```json
{
  "status": 401,
  "erro": "TOKEN_INVALIDO",
  "mensagem": "Token expirado. Faça login novamente."
}
```

### 3.4. Usuário do token removido

`GET /auth/me` com um token válido cujo usuário já não existe no banco

```json
{
  "status": 401,
  "erro": "TOKEN_INVALIDO",
  "mensagem": "O usuário deste token não existe mais. Faça login novamente."
}
```

### 3.5. Credenciais inválidas no login

`POST /auth/login` com senha errada **ou** com e-mail inexistente — a resposta é
deliberadamente idêntica nos dois casos, para não revelar quais e-mails estão
cadastrados

```json
{
  "status": 401,
  "erro": "CREDENCIAIS_INVALIDAS",
  "mensagem": "E-mail ou senha inválidos."
}
```

### 4. Cliente não encontrado

`GET /clientes/99`

```json
{
  "status": 404,
  "erro": "RECURSO_NAO_ENCONTRADO",
  "mensagem": "Cliente com id 99 não encontrado."
}
```

### 5. Rota inexistente

`GET /clientess`

```json
{
  "status": 404,
  "erro": "ROTA_NAO_ENCONTRADA",
  "mensagem": "Rota GET /clientess não encontrada."
}
```

### 6. CPF duplicado

`POST /clientes` com um CPF que já existe

```json
{
  "status": 409,
  "erro": "REGISTRO_DUPLICADO",
  "mensagem": "Já existe um cliente com este CPF."
}
```

> Sem tratamento específico no service, o filtro global traduz o `P2002` do
> Prisma para `"Já existe um registro com este cpf."`. Quando quiser a mensagem
> acima, lance `RegistroDuplicadoException` no service.

### 7. Placa duplicada

`POST /veiculos` com uma placa já cadastrada

```json
{
  "status": 409,
  "erro": "REGISTRO_DUPLICADO",
  "mensagem": "Já existe um veículo com a placa ABC1D23."
}
```

### 8. Exclusão de cliente que possui veículos

`DELETE /clientes/3`

```json
{
  "status": 409,
  "erro": "RECURSO_EM_USO",
  "mensagem": "O cliente não pode ser excluído pois possui veículos vinculados."
}
```

> O mesmo acontece ao excluir um veículo com ordens de serviço, um mecânico com
> ordens vinculadas ou um serviço já lançado em alguma OS — consequência das FKs
> com `Restrict` descritas em [`modelo-dados.md`](./modelo-dados.md). Para
> mecânicos e serviços, a saída é desativar (`ativo = false`) em vez de excluir.

### 9. Alteração de ordem de serviço já finalizada

`PUT /ordens-servico/12` (ou `DELETE`, ou `PATCH` de status) em uma OS com
`status = "CONCLUIDA"`

```json
{
  "status": 409,
  "erro": "OPERACAO_NAO_PERMITIDA",
  "mensagem": "Não é possível alterar uma ordem de serviço com status CONCLUIDA."
}
```

O mesmo vale para `CANCELADA`: os dois são estados finais.

### 9.1. Transição de status inválida

`PATCH /ordens-servico/12/status` com `{ "status": "CONCLUIDA" }` em uma ordem
ainda `ABERTA` (é preciso passar por `EM_ANDAMENTO`)

```json
{
  "status": 409,
  "erro": "OPERACAO_NAO_PERMITIDA",
  "mensagem": "Transição de status inválida: ABERTA → CONCLUIDA."
}
```

As transições permitidas estão no diagrama de [ciclo de vida](./endpoints/ordens-servico.md#ciclo-de-vida).

### 9.2. Status que exige mecânico atribuído

`PATCH /ordens-servico/12/status` com `{ "status": "EM_ANDAMENTO" }` em uma ordem
sem mecânico

```json
{
  "status": 409,
  "erro": "OPERACAO_NAO_PERMITIDA",
  "mensagem": "A ordem de serviço precisa de um mecânico atribuído para ir para o status EM_ANDAMENTO. Informe o mecanicoId em PUT /ordens-servico/12 antes de alterar o status."
}
```

### 9.3. Mecânico inativo recebendo ordem

`POST /ordens-servico` (ou `PUT`) com o `mecanicoId` de um mecânico desativado

```json
{
  "status": 409,
  "erro": "OPERACAO_NAO_PERMITIDA",
  "mensagem": "O mecânico Sergio Bonfim está inativo e não pode receber ordens de serviço."
}
```

> Manter na ordem um mecânico que foi desativado **depois** de ser atribuído é
> permitido — a regra impede apenas novas atribuições.

### 9.4. Serviço inativo lançado em uma ordem

`POST /ordens-servico` (ou `PUT`) com um `servicoId` fora do catálogo ativo

```json
{
  "status": 409,
  "erro": "OPERACAO_NAO_PERMITIDA",
  "mensagem": "O serviço \"Polimento tecnico e cristalizacao\" está inativo e não pode ser lançado em uma ordem de serviço."
}
```

### 9.5. Exclusão de ordem já iniciada

`DELETE /ordens-servico/12` em uma ordem `EM_ANDAMENTO`

```json
{
  "status": 409,
  "erro": "OPERACAO_NAO_PERMITIDA",
  "mensagem": "Só é possível excluir uma ordem de serviço com status ABERTA, e esta está EM_ANDAMENTO. Para encerrá-la sem execução, use PATCH /ordens-servico/12/status com CANCELADA."
}
```

### 10. Erro interno

Qualquer falha inesperada (bug, banco fora no meio da requisição, etc.)

```json
{
  "status": 500,
  "erro": "ERRO_INTERNO",
  "mensagem": "Ocorreu um erro interno no servidor."
}
```

> A resposta **nunca** inclui stack trace, nome de tabela, SQL ou mensagem
> original. O erro completo é registrado no log do servidor pelo `Logger` do
> Nest, com método, URL, status e stack.

### 11. Banco de dados indisponível

`GET /health` com o PostgreSQL fora do ar

```json
{
  "status": 503,
  "erro": "BANCO_INDISPONIVEL",
  "mensagem": "Não foi possível conectar ao banco de dados."
}
```

## Como lançar erros no código

```ts
// 404 padronizado
throw new RecursoNaoEncontradoException('Cliente', id);
throw new RecursoNaoEncontradoException('Ordem de serviço', id);

// 409 com mensagem específica do recurso
throw new RegistroDuplicadoException('Já existe um cliente com este CPF.');
throw new RecursoEmUsoException(
  'O cliente não pode ser excluído pois possui veículos vinculados.',
);
throw new OperacaoNaoPermitidaException(
  `A ordem de serviço ${id} está concluída e não pode mais ser alterada.`,
);
```

Erros do Prisma **não precisam de try/catch** nos services: o filtro global já
traduz `P2002`, `P2003` e `P2025`. Só capture quando quiser uma mensagem mais
específica que a genérica.
