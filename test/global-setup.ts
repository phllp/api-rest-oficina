import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

/**
 * Preparacao do banco de testes, executada uma vez antes da suite e2e.
 *
 * 1. Confere que a DATABASE_URL aponta para o banco de teste;
 * 2. cria o database `oficina_test` caso ainda nao exista;
 * 3. aplica as migrations nele.
 *
 * O `.env.test` e carregado pelo vitest.config.e2e.ts. Como o @nestjs/config
 * monta a configuracao como { ...arquivoEnv, ...process.env }, o valor que
 * chega aqui em process.env tem precedencia sobre o `.env` de desenvolvimento.
 */
export default async function preparaBancoDeTeste(): Promise<void> {
  const urlDeTeste = process.env.DATABASE_URL;

  if (!urlDeTeste) {
    throw new Error(
      'DATABASE_URL nao definida. Confira o arquivo .env.test na raiz do projeto.',
    );
  }

  // Trava de seguranca: impede que os testes apaguem o banco de desenvolvimento.
  if (!urlDeTeste.includes('oficina_test')) {
    throw new Error(
      [
        'Os testes e2e recusaram a executar: a DATABASE_URL nao aponta para o banco de teste.',
        `URL recebida: ${urlDeTeste.replace(/:\/\/[^@]*@/, '://***@')}`,
        'Esperado um database cujo nome contenha "oficina_test" (veja o .env.test).',
      ].join('\n'),
    );
  }

  await criarBancoSeNecessario(urlDeTeste);
  aplicarMigrations(urlDeTeste);

  console.log(`Banco de teste pronto: ${nomeDoBanco(urlDeTeste)}`);
}

/** Extrai o nome do database de uma URL de conexao. */
function nomeDoBanco(url: string): string {
  return new URL(url).pathname.replace(/^\//, '');
}

/**
 * Cria o database de teste conectando na base de manutencao `postgres`.
 * Se o database ja existir, o erro 42P04 (duplicate_database) e ignorado.
 */
async function criarBancoSeNecessario(urlDeTeste: string): Promise<void> {
  const url = new URL(urlDeTeste);
  const banco = nomeDoBanco(urlDeTeste);

  url.pathname = '/postgres';
  url.search = '';

  const prisma = new PrismaClient({ datasourceUrl: url.toString() });

  try {
    await prisma.$executeRawUnsafe(`CREATE DATABASE "${banco}"`);
    console.log(`Database "${banco}" criado.`);
  } catch (erro) {
    if (!ehBancoJaExistente(erro)) {
      throw erro;
    }
  } finally {
    await prisma.$disconnect();
  }
}

/** Reconhece o erro do PostgreSQL para "database ja existe". */
function ehBancoJaExistente(erro: unknown): boolean {
  const mensagem = erro instanceof Error ? erro.message : String(erro);

  return /already exists|42P04/i.test(mensagem);
}

/** Aplica as migrations versionadas no banco de teste. */
function aplicarMigrations(urlDeTeste: string): void {
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: urlDeTeste },
  });
}
