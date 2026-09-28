import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Ambiente {
  Desenvolvimento = 'development',
  Teste = 'test',
  Producao = 'production',
}

/**
 * Contrato das variaveis de ambiente exigidas pela aplicacao.
 * A validacao roda na inicializacao: se algo estiver faltando ou invalido,
 * o processo falha antes de o servidor subir.
 */
export class VariaveisDeAmbiente {
  @IsOptional()
  @IsEnum(Ambiente, {
    message: 'NODE_ENV deve ser "development", "test" ou "production".',
  })
  NODE_ENV: Ambiente = Ambiente.Desenvolvimento;

  @IsNotEmpty({ message: 'DATABASE_URL e obrigatoria e nao pode ficar vazia.' })
  @IsString({ message: 'DATABASE_URL deve ser um texto.' })
  @Matches(/^postgres(ql)?:\/\/.+/, {
    message:
      'DATABASE_URL deve ser uma URL de conexao PostgreSQL, por exemplo: postgresql://usuario:senha@localhost:5432/oficina?schema=public',
  })
  DATABASE_URL!: string;

  @Type(() => Number)
  @IsInt({ message: 'PORT deve ser um numero inteiro.' })
  @Min(1, { message: 'PORT deve estar entre 1 e 65535.' })
  @Max(65535, { message: 'PORT deve estar entre 1 e 65535.' })
  PORT: number = 3000;

  @IsNotEmpty({ message: 'JWT_SECRET e obrigatorio e nao pode ficar vazio.' })
  @IsString({ message: 'JWT_SECRET deve ser um texto.' })
  @MinLength(16, {
    message: 'JWT_SECRET deve ter no minimo 16 caracteres.',
  })
  JWT_SECRET!: string;
}

/**
 * Funcao usada pelo ConfigModule para validar o ambiente na inicializacao.
 * O objeto retornado passa a ser a fonte de configuracao da aplicacao.
 */
export function validate(config: Record<string, unknown>): VariaveisDeAmbiente {
  const variaveis = plainToInstance(VariaveisDeAmbiente, config, {
    exposeDefaultValues: true,
  });

  const erros = validateSync(variaveis, {
    skipMissingProperties: false,
    forbidUnknownValues: false,
  });

  if (erros.length > 0) {
    const mensagens = erros.flatMap((erro) =>
      Object.values(erro.constraints ?? {}),
    );

    throw new Error(
      [
        'Falha na validacao das variaveis de ambiente:',
        ...mensagens.map((mensagem) => `  - ${mensagem}`),
        'Copie o arquivo .env.example para .env e preencha os valores antes de iniciar a aplicacao.',
      ].join('\n'),
    );
  }

  return variaveis;
}
