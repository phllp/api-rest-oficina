/**
 * Seed do banco de dados da oficina.
 *
 * Roda com `npm run db:seed` (ou automaticamente em `npm run db:reset`).
 * O arquivo e executado direto pelo Node 22, que remove as anotacoes de tipo
 * nativamente -- por isso nao ha `enum`, `namespace` nem parameter properties
 * aqui, e todo import de tipo usa `import type`.
 *
 * O seed e idempotente: limpa as tabelas na ordem das chaves estrangeiras,
 * reinicia as sequencias de id e insere sempre o mesmo conjunto de dados.
 */
import { Prisma, PrismaClient, StatusOrdemServico } from '@prisma/client';
import type { Cliente, Mecanico, Servico, Veiculo } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const UM_DIA_EM_MS = 24 * 60 * 60 * 1000;

/** Data de N dias atras, sempre as 9h, para as datas ficarem legiveis. */
function diasAtras(dias: number): Date {
  const data = new Date(Date.now() - dias * UM_DIA_EM_MS);
  data.setHours(9, 0, 0, 0);
  return data;
}

/**
 * Calcula os dois digitos verificadores de um CPF a partir dos 9 primeiros
 * digitos, para que os dados do seed passem em qualquer validacao de CPF.
 */
function gerarCpf(base: string): string {
  if (!/^\d{9}$/.test(base)) {
    throw new Error(`Base de CPF invalida: "${base}" (esperados 9 digitos).`);
  }

  const digitos = base.split('').map(Number);

  const calcularDigito = (numeros: number[]): number => {
    const pesoInicial = numeros.length + 1;
    const soma = numeros.reduce(
      (total, numero, indice) => total + numero * (pesoInicial - indice),
      0,
    );
    const resto = (soma * 10) % 11;
    return resto >= 10 ? 0 : resto;
  };

  const primeiroDigito = calcularDigito(digitos);
  const segundoDigito = calcularDigito([...digitos, primeiroDigito]);

  return `${base}${primeiroDigito}${segundoDigito}`;
}

// ---------------------------------------------------------------------------
// Dados fixos
// ---------------------------------------------------------------------------

const clientes = [
  {
    nome: 'Ana Paula Ribeiro',
    cpfBase: '529982247',
    telefone: '(47) 99101-2233',
  },
  {
    nome: 'Bruno Carvalho Lima',
    cpfBase: '390473717',
    telefone: '(47) 99202-3344',
  },
  {
    nome: 'Carla Menezes Duarte',
    cpfBase: '111444777',
    telefone: '(47) 99303-4455',
  },
  {
    nome: 'Diego Fontana Alves',
    cpfBase: '234567890',
    telefone: '(47) 99404-5566',
  },
  {
    nome: 'Eduarda Nunes Prado',
    cpfBase: '345678901',
    telefone: '(47) 99505-6677',
  },
  {
    nome: 'Felipe Moreira Braga',
    cpfBase: '456789012',
    telefone: '(47) 99606-7788',
  },
  {
    nome: 'Gabriela Souza Rocha',
    cpfBase: '567890123',
    telefone: '(47) 99707-8899',
  },
  {
    nome: 'Henrique Vasques Melo',
    cpfBase: '678901234',
    telefone: '(47) 99808-9900',
  },
  {
    nome: 'Isabela Correia Pinto',
    cpfBase: '789012345',
    telefone: '(47) 99909-0011',
  },
  {
    nome: 'Joao Vitor Camargo',
    cpfBase: '890123456',
    telefone: '(47) 99110-1122',
  },
  {
    nome: 'Karina Lopes Teixeira',
    cpfBase: '901234567',
    telefone: '(47) 99221-2233',
  },
  {
    nome: 'Lucas Andrade Peixoto',
    cpfBase: '112233445',
    telefone: '(47) 99332-3344',
  },
  {
    nome: 'Mariana Silveira Costa',
    cpfBase: '223344556',
    telefone: '(47) 99443-4455',
  },
  {
    nome: 'Nelson Batista Ferraz',
    cpfBase: '334455667',
    telefone: '(47) 99554-5566',
  },
  {
    nome: 'Olivia Martins Guedes',
    cpfBase: '445566778',
    telefone: '(47) 99665-6677',
  },
  {
    nome: 'Patricia Rezende Faria',
    cpfBase: '556677889',
    telefone: '(47) 99776-7788',
  },
  {
    nome: 'Rafael Quintino Barros',
    cpfBase: '667788990',
    telefone: '(47) 99887-8899',
  },
  {
    nome: 'Simone Ferraz Aguiar',
    cpfBase: '778899001',
    telefone: '(47) 99998-9900',
  },
  {
    nome: 'Thiago Bastos Coelho',
    cpfBase: '889900112',
    telefone: '(47) 99109-9011',
  },
  {
    nome: 'Ursula Damiani Reis',
    cpfBase: '990011223',
    telefone: '(47) 99210-0122',
  },
  {
    nome: 'Vinicius Prado Machado',
    cpfBase: '121314151',
    telefone: '(47) 99321-1233',
  },
  {
    nome: 'Wanessa Klein Oliveira',
    cpfBase: '161718192',
    telefone: '(47) 99432-2344',
  },
  {
    nome: 'Xavier Bertoldo Pires',
    cpfBase: '202122232',
    telefone: '(47) 99543-3455',
  },
  {
    nome: 'Yasmin Cardoso Antunes',
    cpfBase: '242526272',
    telefone: '(47) 99654-4566',
  },
  {
    nome: 'Zeno Marcondes Vieira',
    cpfBase: '282930313',
    telefone: '(47) 99765-5677',
  },
];

/**
 * 35 veiculos distribuidos entre os clientes: os dois primeiros ficam sem
 * veiculo, tres clientes tem tres veiculos e o restante tem um ou dois.
 */
const veiculos = [
  {
    clienteIndice: 2,
    placa: 'ABC1234',
    marca: 'Fiat',
    modelo: 'Argo Drive 1.0',
    ano: 2021,
    cor: 'Branco',
  },
  {
    clienteIndice: 2,
    placa: 'RDF5G78',
    marca: 'Chevrolet',
    modelo: 'Onix LT 1.0',
    ano: 2019,
    cor: 'Prata',
  },
  {
    clienteIndice: 2,
    placa: 'JKL9A21',
    marca: 'Volkswagen',
    modelo: 'Gol 1.6',
    ano: 2016,
    cor: 'Cinza',
  },
  {
    clienteIndice: 3,
    placa: 'MNO4567',
    marca: 'Ford',
    modelo: 'Ka SE 1.5',
    ano: 2018,
    cor: 'Vermelho',
  },
  {
    clienteIndice: 3,
    placa: 'PQR7B32',
    marca: 'Toyota',
    modelo: 'Corolla XEi 2.0',
    ano: 2022,
    cor: 'Preto',
  },
  {
    clienteIndice: 4,
    placa: 'STU8901',
    marca: 'Honda',
    modelo: 'Civic EXL 2.0',
    ano: 2020,
    cor: 'Azul',
  },
  {
    clienteIndice: 5,
    placa: 'VWX2C45',
    marca: 'Hyundai',
    modelo: 'HB20 Comfort 1.0',
    ano: 2023,
    cor: 'Branco',
  },
  {
    clienteIndice: 5,
    placa: 'YZA3456',
    marca: 'Fiat',
    modelo: 'Mobi Like 1.0',
    ano: 2020,
    cor: 'Verde',
  },
  {
    clienteIndice: 6,
    placa: 'BCD6E78',
    marca: 'Chevrolet',
    modelo: 'Tracker Premier 1.2',
    ano: 2022,
    cor: 'Cinza',
  },
  {
    clienteIndice: 7,
    placa: 'EFG1122',
    marca: 'Volkswagen',
    modelo: 'Polo Highline 1.0',
    ano: 2021,
    cor: 'Prata',
  },
  {
    clienteIndice: 7,
    placa: 'HIJ4D56',
    marca: 'Toyota',
    modelo: 'Hilux SRV 2.8',
    ano: 2019,
    cor: 'Preto',
  },
  {
    clienteIndice: 8,
    placa: 'KLM3344',
    marca: 'Ford',
    modelo: 'EcoSport Titanium 2.0',
    ano: 2017,
    cor: 'Marrom',
  },
  {
    clienteIndice: 9,
    placa: 'NOP5E67',
    marca: 'Honda',
    modelo: 'Fit LX 1.5',
    ano: 2015,
    cor: 'Prata',
  },
  {
    clienteIndice: 9,
    placa: 'QRS7788',
    marca: 'Hyundai',
    modelo: 'Creta Action 1.6',
    ano: 2023,
    cor: 'Azul',
  },
  {
    clienteIndice: 10,
    placa: 'TUV8F90',
    marca: 'Fiat',
    modelo: 'Toro Freedom 1.8',
    ano: 2021,
    cor: 'Branco',
  },
  {
    clienteIndice: 11,
    placa: 'WXY1234',
    marca: 'Chevrolet',
    modelo: 'Spin LTZ 1.8',
    ano: 2018,
    cor: 'Cinza',
  },
  {
    clienteIndice: 11,
    placa: 'ZAB2G34',
    marca: 'Volkswagen',
    modelo: 'T-Cross Comfortline 1.0',
    ano: 2022,
    cor: 'Vermelho',
  },
  {
    clienteIndice: 11,
    placa: 'CDE5566',
    marca: 'Ford',
    modelo: 'Ranger XLS 3.2',
    ano: 2016,
    cor: 'Prata',
  },
  {
    clienteIndice: 12,
    placa: 'FGH3H45',
    marca: 'Toyota',
    modelo: 'Yaris XL 1.3',
    ano: 2020,
    cor: 'Branco',
  },
  {
    clienteIndice: 13,
    placa: 'IJK7789',
    marca: 'Honda',
    modelo: 'HR-V EX 1.8',
    ano: 2019,
    cor: 'Cinza',
  },
  {
    clienteIndice: 13,
    placa: 'LMN4J56',
    marca: 'Hyundai',
    modelo: 'i30 GLS 1.8',
    ano: 2014,
    cor: 'Preto',
  },
  {
    clienteIndice: 14,
    placa: 'OPQ9900',
    marca: 'Fiat',
    modelo: 'Cronos Drive 1.3',
    ano: 2022,
    cor: 'Prata',
  },
  {
    clienteIndice: 15,
    placa: 'RST5K67',
    marca: 'Chevrolet',
    modelo: 'Prisma LTZ 1.4',
    ano: 2017,
    cor: 'Branco',
  },
  {
    clienteIndice: 15,
    placa: 'UVW1231',
    marca: 'Volkswagen',
    modelo: 'Saveiro Robust 1.6',
    ano: 2019,
    cor: 'Branco',
  },
  {
    clienteIndice: 16,
    placa: 'XYZ6L78',
    marca: 'Ford',
    modelo: 'Fiesta SE 1.6',
    ano: 2015,
    cor: 'Azul',
  },
  {
    clienteIndice: 17,
    placa: 'ABD4455',
    marca: 'Toyota',
    modelo: 'Etios X 1.3',
    ano: 2018,
    cor: 'Prata',
  },
  {
    clienteIndice: 17,
    placa: 'EFH2M89',
    marca: 'Honda',
    modelo: 'City EX 1.5',
    ano: 2021,
    cor: 'Preto',
  },
  {
    clienteIndice: 18,
    placa: 'IJM6677',
    marca: 'Hyundai',
    modelo: 'Tucson GLS 2.0',
    ano: 2016,
    cor: 'Cinza',
  },
  {
    clienteIndice: 19,
    placa: 'NPR8N90',
    marca: 'Fiat',
    modelo: 'Uno Attractive 1.0',
    ano: 2017,
    cor: 'Vermelho',
  },
  {
    clienteIndice: 20,
    placa: 'QST2233',
    marca: 'Chevrolet',
    modelo: 'S10 LTZ 2.8',
    ano: 2020,
    cor: 'Preto',
  },
  {
    clienteIndice: 20,
    placa: 'UVX4P56',
    marca: 'Volkswagen',
    modelo: 'Virtus Comfortline 1.0',
    ano: 2023,
    cor: 'Branco',
  },
  {
    clienteIndice: 21,
    placa: 'YZB7788',
    marca: 'Ford',
    modelo: 'Focus SE 2.0',
    ano: 2014,
    cor: 'Cinza',
  },
  {
    clienteIndice: 22,
    placa: 'CDF9Q12',
    marca: 'Toyota',
    modelo: 'SW4 SRX 2.8',
    ano: 2021,
    cor: 'Preto',
  },
  {
    clienteIndice: 23,
    placa: 'GHI3345',
    marca: 'Honda',
    modelo: 'WR-V EXL 1.5',
    ano: 2019,
    cor: 'Branco',
  },
  {
    clienteIndice: 24,
    placa: 'JKM5R67',
    marca: 'Hyundai',
    modelo: 'HB20S Vision 1.0',
    ano: 2022,
    cor: 'Prata',
  },
];

const mecanicos = [
  {
    nome: 'Adilson Moita',
    especialidade: 'Motor e injecao eletronica',
    telefone: '(47) 3344-1001',
    ativo: true,
  },
  {
    nome: 'Cleber Ramos',
    especialidade: 'Suspensao e freios',
    telefone: '(47) 3344-1002',
    ativo: true,
  },
  {
    nome: 'Ivone Salgado',
    especialidade: 'Eletrica e diagnostico',
    telefone: '(47) 3344-1003',
    ativo: true,
  },
  {
    nome: 'Marcos Tadeu',
    especialidade: 'Cambio e transmissao',
    telefone: '(47) 3344-1004',
    ativo: true,
  },
  {
    nome: 'Sergio Bonfim',
    especialidade: 'Funilaria e pintura',
    telefone: '(47) 3344-1005',
    ativo: false,
  },
];

const servicos = [
  {
    descricao: 'Troca de oleo e filtro',
    preco: '189.90',
    tempoEstimadoMin: 45,
    ativo: true,
  },
  {
    descricao: 'Alinhamento e balanceamento',
    preco: '149.00',
    tempoEstimadoMin: 60,
    ativo: true,
  },
  {
    descricao: 'Revisao do sistema de freios',
    preco: '480.00',
    tempoEstimadoMin: 120,
    ativo: true,
  },
  {
    descricao: 'Troca de embreagem',
    preco: '2350.00',
    tempoEstimadoMin: 420,
    ativo: true,
  },
  {
    descricao: 'Troca de pastilhas de freio',
    preco: '320.50',
    tempoEstimadoMin: 90,
    ativo: true,
  },
  {
    descricao: 'Higienizacao do ar-condicionado',
    preco: '220.00',
    tempoEstimadoMin: 75,
    ativo: true,
  },
  {
    descricao: 'Diagnostico eletronico completo',
    preco: '95.00',
    tempoEstimadoMin: 40,
    ativo: true,
  },
  {
    descricao: 'Troca de correia dentada',
    preco: '1480.00',
    tempoEstimadoMin: 300,
    ativo: true,
  },
  {
    descricao: 'Troca de bateria 60Ah',
    preco: '620.00',
    tempoEstimadoMin: 30,
    ativo: true,
  },
  {
    descricao: 'Polimento tecnico e cristalizacao',
    preco: '50.00',
    tempoEstimadoMin: 180,
    ativo: false,
  },
];

/**
 * 30 ordens de servico com status variados e datas de abertura espalhadas
 * pelos ultimos seis meses. `dataConclusao` e preenchida somente nas
 * CONCLUIDA, sempre alguns dias depois da abertura e no passado.
 */
const ordensServico = [
  {
    veiculoIndice: 0,
    mecanicoIndice: 0,
    status: StatusOrdemServico.CONCLUIDA,
    diasAtrasAbertura: 178,
    diasAteConclusao: 2,
    descricaoProblema: 'Barulho no motor ao acelerar em subida.',
    observacoes: 'Cliente autorizou a troca do filtro por telefone.',
    itens: [
      { servicoIndice: 0, quantidade: 1 },
      { servicoIndice: 6, quantidade: 1 },
    ],
  },
  {
    veiculoIndice: 3,
    mecanicoIndice: 1,
    status: StatusOrdemServico.CONCLUIDA,
    diasAtrasAbertura: 171,
    diasAteConclusao: 3,
    descricaoProblema: 'Pedal do freio baixo e ruido ao frear.',
    observacoes: null,
    itens: [
      { servicoIndice: 2, quantidade: 1 },
      { servicoIndice: 4, quantidade: 1 },
    ],
  },
  {
    veiculoIndice: 5,
    mecanicoIndice: 2,
    status: StatusOrdemServico.CONCLUIDA,
    diasAtrasAbertura: 163,
    diasAteConclusao: 1,
    descricaoProblema: 'Painel acende luz de injecao intermitente.',
    observacoes: 'Sensor de oxigenio limpo durante o servico.',
    itens: [{ servicoIndice: 6, quantidade: 1 }],
  },
  {
    veiculoIndice: 7,
    mecanicoIndice: 3,
    status: StatusOrdemServico.CANCELADA,
    diasAtrasAbertura: 157,
    diasAteConclusao: null,
    descricaoProblema: 'Cambio engasga na segunda marcha.',
    observacoes: 'Cliente desistiu do orcamento apresentado.',
    itens: [{ servicoIndice: 3, quantidade: 1 }],
  },
  {
    veiculoIndice: 9,
    mecanicoIndice: 0,
    status: StatusOrdemServico.CONCLUIDA,
    diasAtrasAbertura: 149,
    diasAteConclusao: 4,
    descricaoProblema: 'Revisao preventiva de 40.000 km.',
    observacoes: null,
    itens: [
      { servicoIndice: 0, quantidade: 1 },
      { servicoIndice: 1, quantidade: 1 },
      { servicoIndice: 5, quantidade: 1 },
    ],
  },
  {
    veiculoIndice: 11,
    mecanicoIndice: 1,
    status: StatusOrdemServico.CONCLUIDA,
    diasAtrasAbertura: 142,
    diasAteConclusao: 2,
    descricaoProblema: 'Volante tremendo acima de 80 km/h.',
    observacoes: null,
    itens: [{ servicoIndice: 1, quantidade: 1 }],
  },
  {
    veiculoIndice: 13,
    mecanicoIndice: 2,
    status: StatusOrdemServico.CONCLUIDA,
    diasAtrasAbertura: 136,
    diasAteConclusao: 1,
    descricaoProblema: 'Carro nao liga de manha.',
    observacoes: 'Bateria original estava com 5 anos de uso.',
    itens: [
      { servicoIndice: 8, quantidade: 1 },
      { servicoIndice: 6, quantidade: 1 },
    ],
  },
  {
    veiculoIndice: 15,
    mecanicoIndice: 0,
    status: StatusOrdemServico.CONCLUIDA,
    diasAtrasAbertura: 128,
    diasAteConclusao: 6,
    descricaoProblema: 'Correia com ruido e folga.',
    observacoes: null,
    itens: [
      { servicoIndice: 7, quantidade: 1 },
      { servicoIndice: 0, quantidade: 1 },
    ],
  },
  {
    veiculoIndice: 17,
    mecanicoIndice: 3,
    status: StatusOrdemServico.CANCELADA,
    diasAtrasAbertura: 121,
    diasAteConclusao: null,
    descricaoProblema: 'Trepidacao ao arrancar em rampa.',
    observacoes: 'Veiculo levado para outra oficina.',
    itens: [{ servicoIndice: 3, quantidade: 1 }],
  },
  {
    veiculoIndice: 19,
    mecanicoIndice: 1,
    status: StatusOrdemServico.CONCLUIDA,
    diasAtrasAbertura: 114,
    diasAteConclusao: 3,
    descricaoProblema: 'Freio dianteiro rangendo.',
    observacoes: null,
    itens: [{ servicoIndice: 4, quantidade: 2 }],
  },
  {
    veiculoIndice: 21,
    mecanicoIndice: 2,
    status: StatusOrdemServico.CONCLUIDA,
    diasAtrasAbertura: 106,
    diasAteConclusao: 2,
    descricaoProblema: 'Ar-condicionado com odor forte.',
    observacoes: null,
    itens: [{ servicoIndice: 5, quantidade: 1 }],
  },
  {
    veiculoIndice: 23,
    mecanicoIndice: 0,
    status: StatusOrdemServico.CONCLUIDA,
    diasAtrasAbertura: 98,
    diasAteConclusao: 5,
    descricaoProblema: 'Consumo de combustivel muito alto.',
    observacoes: 'Bicos injetores limpos.',
    itens: [
      { servicoIndice: 6, quantidade: 1 },
      { servicoIndice: 0, quantidade: 1 },
    ],
  },
  {
    veiculoIndice: 25,
    mecanicoIndice: 1,
    status: StatusOrdemServico.CONCLUIDA,
    diasAtrasAbertura: 90,
    diasAteConclusao: 2,
    descricaoProblema: 'Pneus com desgaste irregular.',
    observacoes: null,
    itens: [
      { servicoIndice: 1, quantidade: 1 },
      { servicoIndice: 4, quantidade: 1 },
    ],
  },
  {
    veiculoIndice: 27,
    mecanicoIndice: 3,
    status: StatusOrdemServico.EM_ANDAMENTO,
    diasAtrasAbertura: 82,
    diasAteConclusao: null,
    descricaoProblema: 'Cambio automatico com tranco na troca.',
    observacoes: 'Aguardando peca do fornecedor.',
    itens: [
      { servicoIndice: 3, quantidade: 1 },
      { servicoIndice: 6, quantidade: 1 },
    ],
  },
  {
    veiculoIndice: 29,
    mecanicoIndice: 2,
    status: StatusOrdemServico.CONCLUIDA,
    diasAtrasAbertura: 74,
    diasAteConclusao: 1,
    descricaoProblema: 'Farol direito queimando com frequencia.',
    observacoes: null,
    itens: [{ servicoIndice: 6, quantidade: 1 }],
  },
  {
    veiculoIndice: 31,
    mecanicoIndice: 0,
    status: StatusOrdemServico.CONCLUIDA,
    diasAtrasAbertura: 66,
    diasAteConclusao: 4,
    descricaoProblema: 'Revisao completa antes de viagem longa.',
    observacoes: null,
    itens: [
      { servicoIndice: 0, quantidade: 1 },
      { servicoIndice: 2, quantidade: 1 },
      { servicoIndice: 1, quantidade: 1 },
    ],
  },
  {
    veiculoIndice: 33,
    mecanicoIndice: 1,
    status: StatusOrdemServico.EM_ANDAMENTO,
    diasAtrasAbertura: 58,
    diasAteConclusao: null,
    descricaoProblema: 'Ruido na suspensao dianteira em lombadas.',
    observacoes: null,
    itens: [{ servicoIndice: 2, quantidade: 1 }],
  },
  {
    veiculoIndice: 2,
    mecanicoIndice: 2,
    status: StatusOrdemServico.CONCLUIDA,
    diasAtrasAbertura: 51,
    diasAteConclusao: 2,
    descricaoProblema: 'Vidro eletrico do motorista nao sobe.',
    observacoes: null,
    itens: [{ servicoIndice: 6, quantidade: 1 }],
  },
  {
    veiculoIndice: 4,
    mecanicoIndice: 3,
    status: StatusOrdemServico.EM_ANDAMENTO,
    diasAtrasAbertura: 45,
    diasAteConclusao: null,
    descricaoProblema: 'Embreagem patinando em marcha alta.',
    observacoes: 'Orcamento aprovado pelo cliente.',
    itens: [{ servicoIndice: 3, quantidade: 1 }],
  },
  {
    veiculoIndice: 6,
    mecanicoIndice: 0,
    status: StatusOrdemServico.CONCLUIDA,
    diasAtrasAbertura: 39,
    diasAteConclusao: 1,
    descricaoProblema: 'Troca de oleo dentro do plano de revisao.',
    observacoes: null,
    itens: [{ servicoIndice: 0, quantidade: 1 }],
  },
  {
    veiculoIndice: 8,
    mecanicoIndice: 1,
    status: StatusOrdemServico.EM_ANDAMENTO,
    diasAtrasAbertura: 33,
    diasAteConclusao: null,
    descricaoProblema: 'Disco de freio empenado.',
    observacoes: null,
    itens: [
      { servicoIndice: 2, quantidade: 1 },
      { servicoIndice: 4, quantidade: 2 },
    ],
  },
  {
    veiculoIndice: 10,
    mecanicoIndice: 2,
    status: StatusOrdemServico.CONCLUIDA,
    diasAtrasAbertura: 28,
    diasAteConclusao: 3,
    descricaoProblema: 'Central multimidia reiniciando sozinha.',
    observacoes: null,
    itens: [{ servicoIndice: 6, quantidade: 1 }],
  },
  {
    veiculoIndice: 12,
    mecanicoIndice: null,
    status: StatusOrdemServico.ABERTA,
    diasAtrasAbertura: 24,
    diasAteConclusao: null,
    descricaoProblema: 'Cliente relata perda de potencia em rodovia.',
    observacoes: 'Aguardando distribuicao para um mecanico.',
    itens: [{ servicoIndice: 6, quantidade: 1 }],
  },
  {
    veiculoIndice: 14,
    mecanicoIndice: 3,
    status: StatusOrdemServico.EM_ANDAMENTO,
    diasAtrasAbertura: 20,
    diasAteConclusao: null,
    descricaoProblema: 'Cambio manual com dificuldade na re.',
    observacoes: null,
    itens: [
      { servicoIndice: 3, quantidade: 1 },
      { servicoIndice: 0, quantidade: 1 },
    ],
  },
  {
    veiculoIndice: 16,
    mecanicoIndice: null,
    status: StatusOrdemServico.ABERTA,
    diasAtrasAbertura: 16,
    diasAteConclusao: null,
    descricaoProblema: 'Revisao dos 20.000 km.',
    observacoes: null,
    itens: [
      { servicoIndice: 0, quantidade: 1 },
      { servicoIndice: 1, quantidade: 1 },
    ],
  },
  {
    veiculoIndice: 18,
    mecanicoIndice: null,
    status: StatusOrdemServico.ABERTA,
    diasAtrasAbertura: 12,
    diasAteConclusao: null,
    descricaoProblema: 'Ar-condicionado gelando pouco.',
    observacoes: null,
    itens: [{ servicoIndice: 5, quantidade: 1 }],
  },
  {
    veiculoIndice: 20,
    mecanicoIndice: null,
    status: StatusOrdemServico.CANCELADA,
    diasAtrasAbertura: 9,
    diasAteConclusao: null,
    descricaoProblema: 'Troca de correia dentada preventiva.',
    observacoes: 'Cancelada a pedido do cliente por prazo.',
    itens: [{ servicoIndice: 7, quantidade: 1 }],
  },
  {
    veiculoIndice: 22,
    mecanicoIndice: null,
    status: StatusOrdemServico.ABERTA,
    diasAtrasAbertura: 6,
    diasAteConclusao: null,
    descricaoProblema: 'Bateria descarregando quando o carro fica parado.',
    observacoes: null,
    itens: [
      { servicoIndice: 8, quantidade: 1 },
      { servicoIndice: 6, quantidade: 1 },
    ],
  },
  {
    veiculoIndice: 24,
    mecanicoIndice: null,
    status: StatusOrdemServico.ABERTA,
    diasAtrasAbertura: 3,
    diasAteConclusao: null,
    descricaoProblema: 'Barulho metalico ao virar o volante.',
    observacoes: null,
    itens: [{ servicoIndice: 2, quantidade: 1 }],
  },
  {
    veiculoIndice: 26,
    mecanicoIndice: null,
    status: StatusOrdemServico.ABERTA,
    diasAtrasAbertura: 1,
    diasAteConclusao: null,
    descricaoProblema: 'Cliente pediu orcamento de revisao geral.',
    observacoes: null,
    itens: [
      { servicoIndice: 0, quantidade: 1 },
      { servicoIndice: 1, quantidade: 1 },
      { servicoIndice: 5, quantidade: 1 },
    ],
  },
];

const usuarioAdministrador = {
  nome: 'Administrador da Oficina',
  email: 'admin@oficina.com',
  senha: '123456',
};

// ---------------------------------------------------------------------------
// Execucao
// ---------------------------------------------------------------------------

/** Apaga os dados respeitando a ordem das chaves estrangeiras. */
async function limparBanco(): Promise<void> {
  await prisma.itemOrdemServico.deleteMany();
  await prisma.ordemServico.deleteMany();
  await prisma.veiculo.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.mecanico.deleteMany();
  await prisma.servico.deleteMany();
  await prisma.usuario.deleteMany();

  // Reinicia as sequencias para que os ids sejam os mesmos em toda execucao.
  const tabelas = [
    'clientes',
    'veiculos',
    'mecanicos',
    'servicos',
    'ordens_servico',
    'itens_ordem_servico',
    'usuarios',
  ];

  for (const tabela of tabelas) {
    await prisma.$executeRawUnsafe(
      `ALTER SEQUENCE "${tabela}_id_seq" RESTART WITH 1`,
    );
  }
}

async function main(): Promise<void> {
  console.log('Limpando as tabelas...');
  await limparBanco();

  console.log('Inserindo clientes...');
  const clientesCriados: Cliente[] = [];
  for (const [indice, cliente] of clientes.entries()) {
    const primeiroNome = cliente.nome.split(' ')[0].toLowerCase();
    clientesCriados.push(
      await prisma.cliente.create({
        data: {
          nome: cliente.nome,
          cpf: gerarCpf(cliente.cpfBase),
          email: `${primeiroNome}.${indice + 1}@email.com`,
          telefone: cliente.telefone,
        },
      }),
    );
  }

  console.log('Inserindo veiculos...');
  const veiculosCriados: Veiculo[] = [];
  for (const veiculo of veiculos) {
    const cliente = clientesCriados[veiculo.clienteIndice];
    if (!cliente) {
      throw new Error(
        `Veiculo ${veiculo.placa} referencia um cliente inexistente.`,
      );
    }

    veiculosCriados.push(
      await prisma.veiculo.create({
        data: {
          placa: veiculo.placa,
          marca: veiculo.marca,
          modelo: veiculo.modelo,
          ano: veiculo.ano,
          cor: veiculo.cor,
          clienteId: cliente.id,
        },
      }),
    );
  }

  console.log('Inserindo mecanicos...');
  const mecanicosCriados: Mecanico[] = [];
  for (const mecanico of mecanicos) {
    mecanicosCriados.push(await prisma.mecanico.create({ data: mecanico }));
  }

  console.log('Inserindo servicos...');
  const servicosCriados: Servico[] = [];
  for (const servico of servicos) {
    servicosCriados.push(await prisma.servico.create({ data: servico }));
  }

  console.log('Inserindo ordens de servico e seus itens...');
  for (const ordem of ordensServico) {
    const veiculo = veiculosCriados[ordem.veiculoIndice];
    if (!veiculo) {
      throw new Error(
        `Ordem de servico referencia o veiculo inexistente de indice ${ordem.veiculoIndice}.`,
      );
    }

    const mecanico =
      ordem.mecanicoIndice === null
        ? null
        : mecanicosCriados[ordem.mecanicoIndice];

    const dataAbertura = diasAtras(ordem.diasAtrasAbertura);
    const dataConclusao =
      ordem.status === StatusOrdemServico.CONCLUIDA &&
      ordem.diasAteConclusao !== null
        ? diasAtras(ordem.diasAtrasAbertura - ordem.diasAteConclusao)
        : null;

    // Cada item congela o preco vigente do servico; o total e a soma exata.
    const itens = ordem.itens.map((item) => {
      const servico = servicosCriados[item.servicoIndice];
      if (!servico) {
        throw new Error(
          `Item referencia o servico inexistente de indice ${item.servicoIndice}.`,
        );
      }

      return {
        servicoId: servico.id,
        quantidade: item.quantidade,
        precoUnitario: servico.preco,
      };
    });

    const valorTotal = itens.reduce(
      (total, item) =>
        total.add(new Prisma.Decimal(item.precoUnitario).mul(item.quantidade)),
      new Prisma.Decimal(0),
    );

    await prisma.ordemServico.create({
      data: {
        veiculoId: veiculo.id,
        mecanicoId: mecanico?.id ?? null,
        status: ordem.status,
        descricaoProblema: ordem.descricaoProblema,
        observacoes: ordem.observacoes,
        dataAbertura,
        dataConclusao,
        valorTotal,
        itens: { create: itens },
      },
    });
  }

  console.log('Inserindo usuario administrador...');
  await prisma.usuario.create({
    data: {
      nome: usuarioAdministrador.nome,
      email: usuarioAdministrador.email,
      senhaHash: await bcrypt.hash(usuarioAdministrador.senha, 10),
    },
  });

  const contagens = {
    clientes: await prisma.cliente.count(),
    veiculos: await prisma.veiculo.count(),
    mecanicos: await prisma.mecanico.count(),
    servicos: await prisma.servico.count(),
    ordens_servico: await prisma.ordemServico.count(),
    itens_ordem_servico: await prisma.itemOrdemServico.count(),
    usuarios: await prisma.usuario.count(),
  };

  console.log('\nSeed concluido. Registros por tabela:');
  console.table(
    Object.entries(contagens).map(([tabela, registros]) => ({
      tabela,
      registros,
    })),
  );
  console.log(
    `Usuario de acesso: ${usuarioAdministrador.email} / ${usuarioAdministrador.senha}`,
  );
}

try {
  await main();
} catch (erro) {
  console.error('Falha ao executar o seed:', erro);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
