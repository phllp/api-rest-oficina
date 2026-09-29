# REST API - Oficina Mecânica do Moita

API REST para a gestão de uma oficina mecânica, desenvolvida como trabalho da
disciplina **APIs, HTTP, JSON e REST**. O projeto é construído em etapas; esta
primeira entrega contém a configuração do ambiente e a base da aplicação
(NestJS + Prisma + PostgreSQL + Swagger), ainda sem recursos de negócio.

## Stack

- **Node.js 22 LTS** + npm
- **NestJS 12** com TypeScript em modo `strict` (projeto ESM)
- **PostgreSQL 16** via Docker Compose
- **Prisma 6** como ORM
- **class-validator** / **class-transformer** para validação de entrada
- **@nestjs/swagger** para a documentação interativa
- **@nestjs/config** para as variáveis de ambiente (validadas na inicialização)
- **@nestjs/jwt** + **bcryptjs** para autenticação JWT
- ESLint + Prettier

## Pré-requisitos

- [Node.js 22 LTS](https://nodejs.org) — com `nvm`, basta rodar `nvm use` na raiz do projeto
- npm 10 ou superior (vem junto com o Node)
- [Docker](https://docs.docker.com/get-docker/) com Docker Compose v2

## Como rodar

```bash
# 1. usar a versão de Node do projeto
nvm use                 # lê o .nvmrc (Node 22)

# 2. instalar as dependências
npm install

# 3. criar o arquivo de variáveis de ambiente
cp .env.example .env

# 4. subir o PostgreSQL
npm run db:up           # docker compose up -d

# 5. gerar o Prisma Client
npm run prisma:generate

# 6. subir a API em modo watch
npm run start:dev
```

A API fica disponível em **http://localhost:3000**.

> **Porta 5432 ocupada?** Ajuste `DB_PORT` no `.env` (por exemplo `DB_PORT=5434`),
> lembrando de trocar a porta dentro da `DATABASE_URL` também, e rode `npm run db:up`
> novamente.

### Migrations

Ainda não existem modelos de negócio, então nenhuma migration foi criada nesta
etapa. A partir da próxima, toda alteração em `prisma/schema.prisma` vira uma
migration versionada:

```bash
npm run prisma:migrate -- --name criar_tabela_clientes
```

## Autenticação

A API é protegida por JWT: **todas as rotas exigem token**, exceto
`POST /auth/login` e `GET /health`.

```bash
# 1. obtenha o token (credenciais criadas pelo seed)
curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@oficina.com","senha":"123456"}'
# { "token": "eyJhbGciOi...", "tipo": "Bearer", "expiraEm": 3600 }

# 2. use o token nas demais chamadas
curl -s http://localhost:3000/clientes \
  -H "Authorization: Bearer eyJhbGciOi..."
```

No Swagger: execute `POST /auth/login`, copie o `token`, clique em **Authorize**
no topo da página e cole. O fluxo completo, o formato do payload e as decisões
de segurança estão em [`docs/autenticacao.md`](./docs/autenticacao.md).

| Usuário do seed     | Senha    |
| ------------------- | -------- |
| `admin@oficina.com` | `123456` |

## Documentação (Swagger)

Com a aplicação no ar, a documentação interativa fica em:

- **http://localhost:3000/docs** — interface do Swagger UI
- **http://localhost:3000/docs-json** — especificação OpenAPI em JSON

O botão **Authorize** guarda o token entre recarregamentos da página
(`persistAuthorization`), e os endpoints protegidos exibem o cadeado.

## Health check

```bash
curl http://localhost:3000/health
```

```json
{ "status": "ok", "database": "up" }
```

O endpoint executa um `SELECT 1` no PostgreSQL. Se o banco estiver fora, a
resposta é `503` com o padrão de erro da API:

```json
{
  "status": 503,
  "erro": "BANCO_INDISPONIVEL",
  "mensagem": "Nao foi possivel conectar ao banco de dados."
}
```

## Scripts

| Comando                   | Descrição                                        |
| ------------------------- | ------------------------------------------------ |
| `npm run start:dev`       | sobe a API em modo watch                         |
| `npm run start:prod`      | executa o build compilado (`dist/`)              |
| `npm run build`           | compila o projeto                                |
| `npm run lint`            | verifica o código com ESLint (`lint:fix` corrige)|
| `npm run format`          | formata o código com Prettier                    |
| `npm run typecheck`       | checa os tipos de todo o projeto, specs inclusos |
| `npm test`                | testes unitários (vitest)                        |
| `npm run test:e2e`        | testes de ponta a ponta (exige o banco no ar)    |
| `npm run db:up`           | sobe o PostgreSQL                                |
| `npm run db:down`         | derruba o PostgreSQL                             |
| `npm run prisma:generate` | regenera o Prisma Client                         |
| `npm run prisma:migrate`  | cria e aplica uma migration                      |
| `npm run prisma:studio`   | abre o Prisma Studio                             |

## Variáveis de ambiente

Copiadas de `.env.example` e validadas na inicialização — a aplicação não sobe se
alguma estiver faltando ou inválida.

| Variável       | Obrigatória | Descrição                                          |
| -------------- | ----------- | -------------------------------------------------- |
| `DATABASE_URL` | sim         | conexão do Prisma com o PostgreSQL                 |
| `PORT`         | não (3000)  | porta HTTP da API                                  |
| `JWT_SECRET`   | sim         | segredo de assinatura dos tokens JWT (mín. 32 caracteres) |
| `JWT_EXPIRES_IN` | não (`1h`) | validade do token (`3600`, `30m`, `1h`, `7d`)    |
| `DB_PORT`      | não (5432)  | porta que o container do Postgres expõe no host    |

## Estrutura do projeto

```
src/
  common/      # filtros, DTOs, decorators e utilitários compartilhados
  config/      # validação das variáveis de ambiente
  prisma/      # PrismaModule (global) e PrismaService
  health/      # GET /health
  modules/     # auth, clientes, veiculos, mecanicos, servicos, ordens-servico
prisma/
  schema.prisma
```

As convenções de código, rotas, erros e documentação estão em
[`CLAUDE.md`](./CLAUDE.md).

## Roadmap

- [x] **Etapa 1** — ambiente, base do projeto, health check e Swagger
- [x] **Etapa 2** — modelo de dados, migration inicial e seed
- [x] **Etapa 3** — padronização de erros, paginação e validação
- [x] **Etapa 4** — clientes e veículos
- [x] **Etapa 5** — mecânicos e serviços
- [x] **Etapa 6** — ordens de serviço, itens e máquina de estados
- [x] **Etapa 7** — autenticação JWT e proteção da API
