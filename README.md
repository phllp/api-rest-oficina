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

## Documentação (Swagger)

Com a aplicação no ar, a documentação interativa fica em:

- **http://localhost:3000/docs** — interface do Swagger UI
- **http://localhost:3000/docs-json** — especificação OpenAPI em JSON

O esquema de autenticação Bearer (JWT) já está registrado e será usado pelas
rotas protegidas na etapa de autenticação.

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
| `JWT_SECRET`   | sim         | segredo dos tokens JWT (etapa de autenticação)     |
| `DB_PORT`      | não (5432)  | porta que o container do Postgres expõe no host    |

## Estrutura do projeto

```
src/
  common/      # filtros, DTOs, decorators e utilitários compartilhados
  config/      # validação das variáveis de ambiente
  prisma/      # PrismaModule (global) e PrismaService
  health/      # GET /health
  modules/     # recursos de negócio (próximas etapas)
prisma/
  schema.prisma
```

As convenções de código, rotas, erros e documentação estão em
[`CLAUDE.md`](./CLAUDE.md).

## Roadmap

- [x] **Etapa 1** — ambiente, base do projeto, health check e Swagger
- [ ] **Etapa 2** — recursos de negócio (clientes, veículos, mecânicos, serviços, ordens de serviço)
- [ ] **Etapa 3** — padronização de erros e paginação
- [ ] **Etapa 4** — autenticação com JWT
