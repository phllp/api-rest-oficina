-- CreateEnum
CREATE TYPE "status_ordem_servico" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "cpf" CHAR(11) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" SERIAL NOT NULL,
    "placa" VARCHAR(7) NOT NULL,
    "marca" VARCHAR(40) NOT NULL,
    "modelo" VARCHAR(60) NOT NULL,
    "ano" INTEGER NOT NULL,
    "cor" VARCHAR(30),
    "cliente_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mecanicos" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "especialidade" VARCHAR(80) NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mecanicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" SERIAL NOT NULL,
    "descricao" VARCHAR(160) NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "tempo_estimado_min" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordens_servico" (
    "id" SERIAL NOT NULL,
    "veiculo_id" INTEGER NOT NULL,
    "mecanico_id" INTEGER,
    "status" "status_ordem_servico" NOT NULL DEFAULT 'ABERTA',
    "descricao_problema" VARCHAR(500) NOT NULL,
    "observacoes" VARCHAR(500),
    "data_abertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_conclusao" TIMESTAMP(3),
    "valor_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_ordem_servico" (
    "id" SERIAL NOT NULL,
    "ordem_servico_id" INTEGER NOT NULL,
    "servico_id" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_ordem_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "senha_hash" VARCHAR(72) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cpf_key" ON "clientes"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_email_key" ON "clientes"("email");

-- CreateIndex
CREATE INDEX "clientes_nome_idx" ON "clientes"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_placa_key" ON "veiculos"("placa");

-- CreateIndex
CREATE INDEX "veiculos_marca_idx" ON "veiculos"("marca");

-- CreateIndex
CREATE INDEX "veiculos_cliente_id_idx" ON "veiculos"("cliente_id");

-- CreateIndex
CREATE INDEX "ordens_servico_status_idx" ON "ordens_servico"("status");

-- CreateIndex
CREATE INDEX "ordens_servico_data_abertura_idx" ON "ordens_servico"("data_abertura");

-- CreateIndex
CREATE INDEX "ordens_servico_veiculo_id_idx" ON "ordens_servico"("veiculo_id");

-- CreateIndex
CREATE INDEX "ordens_servico_mecanico_id_idx" ON "ordens_servico"("mecanico_id");

-- CreateIndex
CREATE UNIQUE INDEX "itens_ordem_servico_ordem_servico_id_servico_id_key" ON "itens_ordem_servico"("ordem_servico_id", "servico_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_mecanico_id_fkey" FOREIGN KEY ("mecanico_id") REFERENCES "mecanicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_ordem_servico" ADD CONSTRAINT "itens_ordem_servico_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_ordem_servico" ADD CONSTRAINT "itens_ordem_servico_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
