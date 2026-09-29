import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Module,
  Param,
  Post,
  Query,
  type INestApplication,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PaginacaoQueryDto } from '../src/common/dto/paginacao-query.dto.js';
import { RecursoNaoEncontradoException } from '../src/common/errors/api.exception.js';
import { ParseIdPipe } from '../src/common/pipes/parse-id.pipe.js';
import { paraSomenteDigitos } from '../src/common/transformers/transformers.js';
import {
  calcularPaginacao,
  montarRespostaPaginada,
} from '../src/common/utils/paginacao.js';
import { IsCpf } from '../src/common/validators/is-cpf.validator.js';
import { configurarApp } from '../src/configurar-app.js';

// ---------------------------------------------------------------------------
// Recurso ficticio, declarado apenas neste arquivo de teste: exercita a
// infraestrutura comum sem depender de nenhum modulo de negocio.
// ---------------------------------------------------------------------------

class ItemFakeDto {
  @Type(() => Number)
  @IsInt({ message: 'quantidade deve ser um numero inteiro.' })
  @Min(1, { message: 'quantidade deve ser maior ou igual a 1.' })
  quantidade!: number;
}

class CriarFakeDto {
  @IsString({ message: 'nome deve ser um texto.' })
  @IsNotEmpty({ message: 'nome nao pode ficar vazio.' })
  nome!: string;

  @Transform(paraSomenteDigitos)
  @IsCpf()
  cpf!: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ItemFakeDto)
  itens?: ItemFakeDto[];
}

class FiltroFakeQueryDto extends PaginacaoQueryDto {
  @IsOptional()
  @IsString({ message: 'nome deve ser um texto.' })
  nome?: string;
}

const REGISTROS = Array.from({ length: 25 }, (_, indice) => ({
  id: indice + 1,
  nome: `Registro ${indice + 1}`,
  preco: new Prisma.Decimal('189.90'),
}));

@Controller('fakes')
class FakeController {
  @Get()
  listar(@Query() filtro: FiltroFakeQueryDto) {
    const { skip, take } = calcularPaginacao(filtro);

    return montarRespostaPaginada(
      REGISTROS.slice(skip, skip + take),
      REGISTROS.length,
      filtro,
    );
  }

  @Get('quebrado')
  quebrar() {
    throw new Error('detalhe interno que nao pode vazar');
  }

  @Get('prisma-duplicado')
  duplicado() {
    throw new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { modelName: 'Cliente', target: ['cpf'] },
    });
  }

  @Get(':id')
  buscar(@Param('id', ParseIdPipe) id: number) {
    const registro = REGISTROS.find((item) => item.id === id);

    if (!registro) {
      throw new RecursoNaoEncontradoException('Registro', id);
    }

    return registro;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  criar(@Body() dto: CriarFakeDto) {
    return { id: 99, ...dto };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param('id', ParseIdPipe) _id: number): void {
    // 204 sem corpo: o interceptor de Decimal nao pode quebrar aqui.
  }
}

@Module({ controllers: [FakeController] })
class FakeModule {}

interface CorpoErro {
  status: number;
  erro: string;
  mensagem: string;
  detalhes?: { campo: string; mensagem: string }[];
}

interface CorpoPaginado {
  page: number;
  limit: number;
  total: number;
  data: { id: number; nome: string; preco: number }[];
}

/** Lista os campos que apareceram nos detalhes de um erro de validacao. */
function camposComErro(corpo: CorpoErro): string[] {
  return (corpo.detalhes ?? []).map((detalhe) => detalhe.campo);
}

/**
 * Este arquivo monta um modulo proprio (FakeModule), sem o AppModule -- logo
 * sem o AuthModule que registra o JwtAuthGuard global. Por isso as chamadas
 * aqui nao levam token: o objetivo e exercitar a infraestrutura comum
 * (validacao, filtro de erros, paginacao) isolada da autenticacao, que tem
 * cobertura propria em auth.e2e-spec.ts.
 */
describe('Infraestrutura comum (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [FakeModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configurarApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('validacao (400 com detalhes)', () => {
    it('lista os campos invalidos, inclusive aninhados com notacao de ponto', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/fakes')
        .send({ nome: '', cpf: '12345678900', itens: [{ quantidade: 0 }] })
        .expect(400);

      const corpo = resposta.body as CorpoErro;

      expect(corpo).toMatchObject({
        status: 400,
        erro: 'DADOS_INVALIDOS',
        mensagem: 'Os dados enviados são inválidos.',
      });

      const campos = camposComErro(corpo);

      expect(campos).toContain('nome');
      expect(campos).toContain('cpf');
      expect(campos).toContain('itens.0.quantidade');
    });

    it('rejeita campo nao declarado no DTO (forbidNonWhitelisted)', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/fakes')
        .send({ nome: 'Ana', cpf: '52998224725', apelido: 'Aninha' })
        .expect(400);

      const corpo = resposta.body as CorpoErro;

      expect(corpo.erro).toBe('DADOS_INVALIDOS');
      expect(camposComErro(corpo)).toContain('apelido');
    });

    it('aceita payload valido e aplica os transformers', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/fakes')
        .send({ nome: 'Ana Paula', cpf: '529.982.247-25' })
        .expect(201);

      expect(resposta.body).toEqual({
        id: 99,
        nome: 'Ana Paula',
        cpf: '52998224725',
      });
    });
  });

  it('JSON malformado responde 400 JSON_INVALIDO', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/fakes')
      .set('Content-Type', 'application/json')
      .send('{"nome": ')
      .expect(400);

    expect(resposta.body).toEqual({
      status: 400,
      erro: 'JSON_INVALIDO',
      mensagem: 'O corpo da requisição não é um JSON válido.',
    });
  });

  it('id invalido responde 400 DADOS_INVALIDOS', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/fakes/abc')
      .expect(400);

    expect(resposta.body).toEqual({
      status: 400,
      erro: 'DADOS_INVALIDOS',
      mensagem: 'O parâmetro id deve ser um número inteiro positivo.',
    });
  });

  it('recurso inexistente responde 404 RECURSO_NAO_ENCONTRADO', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/fakes/999')
      .expect(404);

    expect(resposta.body).toEqual({
      status: 404,
      erro: 'RECURSO_NAO_ENCONTRADO',
      mensagem: 'Registro com id 999 não encontrado.',
    });
  });

  it('rota inexistente responde 404 ROTA_NAO_ENCONTRADA', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/rota-que-nao-existe')
      .expect(404);

    expect(resposta.body).toEqual({
      status: 404,
      erro: 'ROTA_NAO_ENCONTRADA',
      mensagem: 'Rota GET /rota-que-nao-existe não encontrada.',
    });
  });

  it('erro do Prisma P2002 responde 409 REGISTRO_DUPLICADO', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/fakes/prisma-duplicado')
      .expect(409);

    expect(resposta.body).toEqual({
      status: 409,
      erro: 'REGISTRO_DUPLICADO',
      mensagem: 'Já existe um registro com este cpf.',
    });
  });

  it('excecao nao tratada responde 500 sem vazar detalhes', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/fakes/quebrado')
      .expect(500);

    expect(resposta.body).toEqual({
      status: 500,
      erro: 'ERRO_INTERNO',
      mensagem: 'Ocorreu um erro interno no servidor.',
    });
    expect(JSON.stringify(resposta.body)).not.toContain('detalhe interno');
  });

  describe('paginacao', () => {
    it('usa page=1 e limit=10 por padrao', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/fakes')
        .expect(200);

      const corpo = resposta.body as CorpoPaginado;

      expect(corpo).toMatchObject({ page: 1, limit: 10, total: 25 });
      expect(corpo.data).toHaveLength(10);
      expect(corpo.data[0]).toMatchObject({ id: 1 });
    });

    it('respeita page e limit informados', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/fakes?page=3&limit=10')
        .expect(200);

      const corpo = resposta.body as CorpoPaginado;

      expect(corpo).toMatchObject({ page: 3, limit: 10, total: 25 });
      expect(corpo.data).toHaveLength(5);
      expect(corpo.data[0]).toMatchObject({ id: 21 });
    });

    it('pagina alem do total responde 200 com data vazio', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/fakes?page=99&limit=10')
        .expect(200);

      expect(resposta.body).toEqual({
        page: 99,
        limit: 10,
        total: 25,
        data: [],
      });
    });

    it('rejeita page e limit fora da faixa', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/fakes?page=0&limit=500')
        .expect(400);

      const campos = camposComErro(resposta.body as CorpoErro);

      expect(campos).toEqual(expect.arrayContaining(['page', 'limit']));
    });

    it('serializa Decimal como number na listagem', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/fakes?limit=1')
        .expect(200);

      const corpo = resposta.body as CorpoPaginado;

      expect(corpo.data[0].preco).toBe(189.9);
      expect(typeof corpo.data[0].preco).toBe('number');
    });
  });

  it('DELETE responde 204 sem corpo', async () => {
    const resposta = await request(app.getHttpServer())
      .delete('/fakes/1')
      .expect(204);

    expect(resposta.body).toEqual({});
    expect(resposta.text).toBe('');
  });
});
