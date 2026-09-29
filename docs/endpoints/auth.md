# Endpoints — Autenticação

Login e identificação do usuário. O fluxo completo, o formato do token e as
decisões de segurança estão em [`../autenticacao.md`](../autenticacao.md); o
padrão das respostas de erro, em [`../erros.md`](../erros.md).

| Método | URL           | Autenticação | Objetivo resumido                      |
| ------ | ------------- | ------------ | -------------------------------------- |
| POST   | `/auth/login` | **pública**  | Troca e-mail e senha por um token JWT  |
| GET    | `/auth/me`    | requer token | Identifica o dono do token enviado     |

---

### POST /auth/login

**Objetivo:** autenticar um usuário e emitir o token JWT usado nas demais chamadas. É uma das duas rotas públicas da API.

**Parâmetros de rota / consulta:** Não possui.

**JSON enviado:**

```json
{
  "email": "admin@oficina.com",
  "senha": "123456"
}
```

Regras de entrada: `email` precisa ser um e-mail válido e é normalizado para
minúsculas (`ADMIN@OFICINA.COM` funciona); `senha` é um texto não vazio. Campos
não declarados no DTO fazem a requisição falhar com 400.

**Resposta de sucesso:** `200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5Ab2ZpY2luYS5jb20iLCJpYXQiOjE3OTAwMDAwMDAsImV4cCI6MTc5MDAwMzYwMH0.xxxxx",
  "tipo": "Bearer",
  "expiraEm": 3600
}
```

`expiraEm` é a validade em **segundos**, derivada das claims `exp - iat` do
próprio token — configurável por `JWT_EXPIRES_IN` (padrão `1h`).

**Respostas de erro:**

| HTTP | Código de erro          | Quando ocorre                                                             |
| ---- | ----------------------- | ------------------------------------------------------------------------- |
| 400  | `DADOS_INVALIDOS`       | `email` inválido, `senha` vazia, ou campo não declarado no DTO             |
| 400  | `JSON_INVALIDO`         | O corpo enviado não é um JSON válido                                      |
| 401  | `CREDENCIAIS_INVALIDAS` | E-mail inexistente **ou** senha incorreta — a resposta é idêntica nos dois casos |

```json
{
  "status": 401,
  "erro": "CREDENCIAIS_INVALIDAS",
  "mensagem": "E-mail ou senha inválidos."
}
```

A resposta 401 acompanha o header `WWW-Authenticate: Bearer`.

---

### GET /auth/me

**Objetivo:** devolver os dados do usuário autenticado, confirmando de quem é o token em uso. Útil para a interface exibir quem está logado.

**Requer autenticação:** `Authorization: Bearer <token>`

**Parâmetros de rota / consulta:** Não possui.

**JSON enviado:** Não possui corpo.

**Resposta de sucesso:** `200 OK`

```json
{
  "id": 1,
  "nome": "Administrador da Oficina",
  "email": "admin@oficina.com"
}
```

O campo `senhaHash` **nunca** é devolvido — o `select` do service não o inclui.

**Respostas de erro:**

| HTTP | Código de erro    | Quando ocorre                                                                 |
| ---- | ----------------- | ----------------------------------------------------------------------------- |
| 401  | `NAO_AUTENTICADO` | Header `Authorization` ausente                                                |
| 401  | `TOKEN_INVALIDO`  | Formato do header inválido, token malformado/adulterado, token expirado, ou o usuário do token não existe mais |

```json
{
  "status": 401,
  "erro": "TOKEN_INVALIDO",
  "mensagem": "O usuário deste token não existe mais. Faça login novamente."
}
```
