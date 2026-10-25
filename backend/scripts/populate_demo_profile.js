import bcrypt from 'bcrypt';
import { openDb } from '../src/db.js';

async function populateDemoProfile() {
  console.log("🚀 Iniciando criação e povoamento do Perfil Demonstração Vet Care...");
  const db = await openDb();

  try {
    // 1. Identificar ou Criar a Clínica de Demonstração
    let clinica = await db.get(`SELECT * FROM clinicas WHERE email = ?`, ['demo@vetcare.com']);

    if (!clinica) {
      const resClinica = await db.run(`
        INSERT INTO clinicas (
          nome, cnpj, email, telefone, endereco,
          status_assinatura, onboarding_concluido, data_expiracao, plano_id
        ) VALUES (
          'VetCare Hospital Veterinário & Centro Diagnóstico 24h',
          '12.345.678/0001-99',
          'demo@vetcare.com',
          '(11) 3456-7890',
          'Av. Paulista, 1500 - Bela Vista, São Paulo - SP',
          'active',
          1,
          '2035-12-31',
          'hospital'
        )
      `);
      clinica = { id: resClinica.lastID };
      console.log(`🏥 Nova Clínica de Demonstração criada (ID: ${clinica.id})`);
    } else {
      console.log(`🏥 Clínica de Demonstração existente localizada (ID: ${clinica.id}). Atualizando plano e status...`);
      await db.run(`
        UPDATE clinicas SET
          nome = 'VetCare Hospital Veterinário & Centro Diagnóstico 24h',
          status_assinatura = 'active',
          onboarding_concluido = 1,
          plano_id = 'hospital',
          data_expiracao = '2035-12-31'
        WHERE id = ?
      `, [clinica.id]);
    }

    const clinicaId = clinica.id;

    // 2. Limpar dados anteriores dessa clínica de teste específica para garantir dados limpos e coerentes
    console.log("🧹 Limpando dados antigos vinculados a esta clínica...");
    const tabelas = [
      'anexos', 'exames', 'internacao_sinais_vitais', 'internacao_medicacoes',
      'internacoes', 'vacinas', 'agendamentos', 'retornos', 'prontuarios',
      'receituario', 'orcamentos', 'banho_tosa', 'estoque_movimentacoes',
      'servicos', 'comissoes', 'comissoes_regras', 'financeiro',
      'animais', 'responsaveis', 'configuracoes', 'configuracoes_whatsapp', 'templates'
    ];

    for (const t of tabelas) {
      try {
        if (t === 'internacao_medicacoes' || t === 'internacao_sinais_vitais') {
          await db.run(`DELETE FROM ${t} WHERE internacao_id IN (SELECT id FROM internacoes WHERE clinica_id = ?)`, [clinicaId]);
        } else {
          await db.run(`DELETE FROM ${t} WHERE clinica_id = ?`, [clinicaId]);
        }
      } catch (err) {
        // Ignora se tabela tiver outro schema
      }
    }

    // 3. Usuários da Equipe Clínica
    console.log("👥 Criando usuários (Administrador, Veterinários e Recepção)...");
    const senhaDemoHash = await bcrypt.hash('demo123', 10);
    const senhaAdminHash = await bcrypt.hash('admin123', 10);

    // Usuário Principal Demo
    let userDemo = await db.get(`SELECT id FROM usuarios WHERE email = ?`, ['demo@vetcare.com']);
    if (!userDemo) {
      const resU = await db.run(`
        INSERT INTO usuarios (clinica_id, nome, email, senha, perfil, ativo)
        VALUES (?, 'Dr. Mateus Silva (Diretor Clínico)', 'demo@vetcare.com', ?, 'admin', 1)
      `, [clinicaId, senhaDemoHash]);
      userDemo = { id: resU.lastID };
    } else {
      await db.run(`
        UPDATE usuarios SET clinica_id = ?, nome = 'Dr. Mateus Silva (Diretor Clínico)', senha = ?, perfil = 'admin', ativo = 1
        WHERE id = ?
      `, [clinicaId, senhaDemoHash, userDemo.id]);
    }

    // Usuário admin@vetcare.com também para conveniência
    let userAdmin = await db.get(`SELECT id FROM usuarios WHERE email = ?`, ['admin@vetcare.com']);
    if (!userAdmin) {
      await db.run(`
        INSERT INTO usuarios (clinica_id, nome, email, senha, perfil, ativo)
        VALUES (?, 'Dr. Mateus Silva (Admin)', 'admin@vetcare.com', ?, 'admin', 1)
      `, [clinicaId, senhaAdminHash]);
    } else {
      await db.run(`
        UPDATE usuarios SET clinica_id = ?, nome = 'Dr. Mateus Silva (Admin)', senha = ?, perfil = 'admin', ativo = 1
        WHERE id = ?
      `, [clinicaId, senhaAdminHash, userAdmin.id]);
    }

    // Veterinária Plantonista
    let vetCamila = await db.get(`SELECT id FROM usuarios WHERE email = ?`, ['camila.vet@vetcare24h.com.br']);
    let vetCamilaId;
    if (!vetCamila) {
      const r = await db.run(`
        INSERT INTO usuarios (clinica_id, nome, email, senha, perfil, ativo)
        VALUES (?, 'Dra. Camila Rocha', 'camila.vet@vetcare24h.com.br', ?, 'veterinario', 1)
      `, [clinicaId, senhaDemoHash]);
      vetCamilaId = r.lastID;
    } else {
      await db.run(`UPDATE usuarios SET clinica_id = ? WHERE id = ?`, [clinicaId, vetCamila.id]);
      vetCamilaId = vetCamila.id;
    }

    // Veterinário Cirurgião
    let vetRafael = await db.get(`SELECT id FROM usuarios WHERE email = ?`, ['rafael.vet@vetcare24h.com.br']);
    let vetRafaelId;
    if (!vetRafael) {
      const r = await db.run(`
        INSERT INTO usuarios (clinica_id, nome, email, senha, perfil, ativo)
        VALUES (?, 'Dr. Rafael Mendes (Cirurgia)', 'rafael.vet@vetcare24h.com.br', ?, 'veterinario', 1)
      `, [clinicaId, senhaDemoHash]);
      vetRafaelId = r.lastID;
    } else {
      await db.run(`UPDATE usuarios SET clinica_id = ? WHERE id = ?`, [clinicaId, vetRafael.id]);
      vetRafaelId = vetRafael.id;
    }

    // 4. Configurações da Clínica
    console.log("⚙️ Configurando parâmetros da clínica e WhatsApp...");
    await db.run(`
      INSERT INTO configuracoes (
        clinica_id, nome_clinica, crmv, endereco, telefone, email, cnpj,
        assinatura_digital, horario_funcionamento, dias_funcionamento, tema,
        notificacoes_email, notificacoes_whatsapp
      ) VALUES (
        ?, 'VetCare Hospital Veterinário 24h', 'CRMV-SP 45.892',
        'Av. Paulista, 1500 - Bela Vista, São Paulo - SP',
        '(11) 3456-7890', 'contato@vetcare24h.com.br', '12.345.678/0001-99',
        'Dr. Mateus Silva - CRMV/SP 45892 (Responsável Técnico)',
        'Atendimento Contínuo 24h (Urgência e Rotina)',
        'Segunda a Domingo (24 Horas)',
        'light', 1, 1
      )
    `, [clinicaId]);

    await db.run(`
      INSERT INTO configuracoes_whatsapp (
        clinica_id, ativo, lembrete_consulta, lembrete_vacina, lembrete_aniversario,
        mensagem_consulta, mensagem_vacina, mensagem_aniversario
      ) VALUES (
        ?, 1, 1, 1, 1,
        'Olá, {tutor}! Lembramos da consulta do(a) {pet} agendada para {data} às {horario} no VetCare Hospital. Até breve!',
        'Olá, {tutor}! A vacina {vacina} do(a) {pet} vence em breve ({data}). Mantenha a proteção em dia!',
        'Parabéns ao(à) {pet}! Hoje é um dia muito especial. Toda a equipe do VetCare deseja muita saúde e alegria! 🐾🎉'
      )
    `, [clinicaId]);

    // 5. Regras de Comissões dos Veterinários
    console.log("💰 Inserindo regras de comissão...");
    await db.run(`
      INSERT INTO comissoes_regras (clinica_id, usuario_id, tipo_comissao, valor)
      VALUES (?, ?, 'percentual', 20.0)
    `, [clinicaId, vetCamilaId]);

    await db.run(`
      INSERT INTO comissoes_regras (clinica_id, usuario_id, tipo_comissao, valor)
      VALUES (?, ?, 'percentual', 25.0)
    `, [clinicaId, vetRafaelId]);

    // 6. Cadastro de Tutores (Responsáveis)
    console.log("👨‍👩‍👧‍👦 Inserindo tutores realistas...");
    const listaTutores = [
      {
        nome: 'Beatriz Albuquerque', cpf: '234.567.890-12', rg: '34.567.890-1',
        nascimento: '1988-04-14', celular: '(11) 98765-4321', telefone: '(11) 3214-5500',
        email: 'beatriz.alb@gmail.com', cep: '01415-002', endereco: 'Rua Bela Cintra, 890, Apto 42',
        bairro: 'Consolação', cidade: 'São Paulo', estado: 'SP',
        obs: 'Tutor muito cuidadoso. Sempre pontual nas revisões.'
      },
      {
        nome: 'Rodrigo Mendonça', cpf: '345.678.901-23', rg: '29.876.543-2',
        nascimento: '1982-11-20', celular: '(11) 99123-4567', telefone: '(11) 3845-1200',
        email: 'rodrigo.mendonca@outlook.com', cep: '04515-011', endereco: 'Av. Ibirapuera, 2300',
        bairro: 'Moema', cidade: 'São Paulo', estado: 'SP',
        obs: 'Possui 2 cães de porte médio/grande. Preferência por atendimento aos sábados.'
      },
      {
        nome: 'Fernanda Vasconcelos', cpf: '456.789.012-34', rg: '41.234.567-8',
        nascimento: '1993-07-08', celular: '(11) 97654-3210', telefone: '(11) 3081-9988',
        email: 'fe.vasconcelos@gmail.com', cep: '05010-000', endereco: 'Rua Cardoso de Almeida, 120',
        bairro: 'Perdizes', cidade: 'São Paulo', estado: 'SP',
        obs: 'Gatos com histórico de estresse em transporte. Utilizar feromônios na consulta.'
      },
      {
        nome: 'Carlos Eduardo Lima', cpf: '567.890.123-45', rg: '18.765.432-0',
        nascimento: '1979-02-28', celular: '(11) 98234-5678', telefone: '(11) 3032-4411',
        email: 'carlos.edu@uol.com.br', cep: '05422-001', endereco: 'Rua dos Pinheiros, 450, Apto 101',
        bairro: 'Pinheiros', cidade: 'São Paulo', estado: 'SP',
        obs: 'Zeus é cão de guarda e trabalho, muito forte e sociável com a equipe.'
      },
      {
        nome: 'Juliana Zanetti', cpf: '678.901.234-56', rg: '38.901.234-5',
        nascimento: '1995-09-15', celular: '(11) 97123-8901', telefone: '(11) 3571-0022',
        email: 'ju.zanetti@gmail.com', cep: '04101-000', endereco: 'Rua Vergueiro, 1890',
        bairro: 'Vila Mariana', cidade: 'São Paulo', estado: 'SP',
        obs: 'Alergia severa da Mel a frango. Segue dieta hipoalergênica rigorosa.'
      },
      {
        nome: 'Lucas Antunes', cpf: '789.012.345-67', rg: '44.556.677-9',
        nascimento: '1990-12-05', celular: '(11) 99876-5432', telefone: '(11) 2978-3344',
        email: 'lucas.antunes@icloud.com', cep: '02011-000', endereco: 'Rua Voluntários da Pátria, 1420',
        bairro: 'Santana', cidade: 'São Paulo', estado: 'SP',
        obs: 'Cliente assíduo de banho e tosa e profilaxia dental.'
      },
      {
        nome: 'Patrícia Guimarães', cpf: '890.123.456-78', rg: '32.112.233-4',
        nascimento: '1985-06-18', celular: '(11) 98543-2109', telefone: '(11) 2091-8877',
        email: 'patricia.guima@gmail.com', cep: '03080-000', endereco: 'Rua Tuiuti, 980',
        bairro: 'Tatuapé', cidade: 'São Paulo', estado: 'SP',
        obs: 'Bob possui síndrome braquiocefálica leve. Evitar calor excessivo.'
      },
      {
        nome: 'Marcos Vinicius Ramos', cpf: '901.234.567-89', rg: '25.667.889-0',
        nascimento: '1981-10-30', celular: '(11) 97321-6540', telefone: '(11) 3741-2299',
        email: 'marcos.ramos@gmail.com', cep: '05650-000', endereco: 'Av. Giovanni Gronchi, 3500',
        bairro: 'Morumbi', cidade: 'São Paulo', estado: 'SP',
        obs: 'Acompanhamento preventivo de rotina.'
      },
      // Tutores inativos há mais de 180 dias (alimentam perfeitamente o módulo de Retenção / Clientes Sumidos!)
      {
        nome: 'Camila Siqueira', cpf: '123.890.456-01', rg: '49.889.001-2',
        nascimento: '1992-03-22', celular: '(11) 96543-1278', telefone: '(11) 5092-1100',
        email: 'camila.siq@hotmail.com', cep: '04571-010', endereco: 'Av. Eng. Luís Carlos Berrini, 700',
        bairro: 'Brooklin', cidade: 'São Paulo', estado: 'SP',
        obs: 'Cliente ausente há mais de 7 meses. Candidata a campanha de resgate.'
      },
      {
        nome: 'André Luiz Castro', cpf: '234.901.567-12', rg: '21.445.667-8',
        nascimento: '1975-08-11', celular: '(11) 97456-1234', telefone: '(11) 2063-4400',
        email: 'andre.castro@gmail.com', cep: '04205-001', endereco: 'Rua Silva Bueno, 1150',
        bairro: 'Ipiranga', cidade: 'São Paulo', estado: 'SP',
        obs: 'Última vacina vencida há meses. Enviar lembrete via WhatsApp.'
      }
    ];

    const tutorIds = [];
    for (const t of listaTutores) {
      const resT = await db.run(`
        INSERT INTO responsaveis (
          clinica_id, nome, cpf, rg, nascimento, telefone, celular,
          email, cep, endereco, estado, cidade, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        clinicaId, t.nome, t.cpf, t.rg, t.nascimento, t.telefone, t.celular,
        t.email, t.cep, `${t.endereco} - ${t.bairro}`, t.estado, t.cidade, t.obs
      ]);
      tutorIds.push(resT.lastID);
    }

    // 7. Cadastro de Animais (Pacientes)
    console.log("🐶🐱 Inserindo pacientes com perfis completos...");
    const listaAnimais = [
      // Tutora 0: Beatriz
      { resp: tutorIds[0], nome: 'Thor', especie: 'Cachorro', raca: 'Golden Retriever', sexo: 'Macho', nasc: '2021-05-10', idade: 4, un: 'anos', temp: 'Muito Dócil', porte: 'Grande', pel: 'Dourada Longa', castrado: 1, chip: '981098102345671', plano: 'Plano Ouro Pet Top' },
      { resp: tutorIds[0], nome: 'Luna', especie: 'Gato', raca: 'Siamês', sexo: 'Fêmea', nasc: '2023-08-20', idade: 2, un: 'anos', temp: 'Calma e Afetuosa', porte: 'Pequeno', pel: 'Seal Point', castrado: 1, chip: '981098102345672', plano: 'Plano PetCare Essencial' },
      // Tutor 1: Rodrigo
      { resp: tutorIds[1], nome: 'Bolinha', especie: 'Cachorro', raca: 'Poodle Toy', sexo: 'Macho', nasc: '2019-03-12', idade: 6, un: 'anos', temp: 'Dócil e Sensível', porte: 'Pequeno', pel: 'Branca Encaracolada', castrado: 1, chip: '981098102345673', plano: 'Particular' },
      { resp: tutorIds[1], nome: 'Apolo', especie: 'Cachorro', raca: 'Pastor Alemão', sexo: 'Macho', nasc: '2022-10-01', idade: 3, un: 'anos', temp: 'Ativo e Protetor', porte: 'Grande', pel: 'Capa Preta', castrado: 0, chip: '981098102345674', plano: 'Particular' },
      // Tutora 2: Fernanda
      { resp: tutorIds[2], nome: 'Mia', especie: 'Gato', raca: 'Persa', sexo: 'Fêmea', nasc: '2024-02-14', idade: 1, un: 'ano', temp: 'Tranquila', porte: 'Pequeno', pel: 'Branca Fofa', castrado: 1, chip: '981098102345675', plano: 'HealthPet Premium' },
      { resp: tutorIds[2], nome: 'Chico', especie: 'Cachorro', raca: 'SRD (Vira-lata)', sexo: 'Macho', nasc: '2020-07-25', idade: 5, un: 'anos', temp: 'Extremamente Dócil', porte: 'Médio', pel: 'Caramelo Curta', castrado: 1, chip: '981098102345676', plano: 'Particular' },
      // Tutor 3: Carlos
      { resp: tutorIds[3], nome: 'Zeus', especie: 'Cachorro', raca: 'Rottweiler', sexo: 'Macho', nasc: '2021-09-18', idade: 4, un: 'anos', temp: 'Sociável e Firme', porte: 'Grande', pel: 'Preto e Castanho', castrado: 1, chip: '981098102345677', plano: 'Particular' },
      // Tutora 4: Juliana
      { resp: tutorIds[4], nome: 'Mel', especie: 'Cachorro', raca: 'Shih Tzu', sexo: 'Fêmea', nasc: '2022-04-05', idade: 3, un: 'anos', temp: 'Carinhosa', porte: 'Pequeno', pel: 'Tricolor Longa', castrado: 1, chip: '981098102345678', plano: 'Porto Seguro Pet' },
      { resp: tutorIds[4], nome: 'Frederico', especie: 'Gato', raca: 'Maine Coon', sexo: 'Macho', nasc: '2023-01-10', idade: 2, un: 'anos', temp: 'Curioso e Gentil', porte: 'Grande', pel: 'Cinza Tigrado Longo', castrado: 1, chip: '981098102345679', plano: 'Particular' },
      // Tutor 5: Lucas
      { resp: tutorIds[5], nome: 'Pipoca', especie: 'Cachorro', raca: 'Spitz Alemão', sexo: 'Fêmea', nasc: '2024-04-12', idade: 1, un: 'ano', temp: 'Alegre e Alerta', porte: 'Pequeno', pel: 'Laranja Espessa', castrado: 1, chip: '981098102345680', plano: 'Particular' },
      // Tutora 6: Patrícia
      { resp: tutorIds[6], nome: 'Bob', especie: 'Cachorro', raca: 'Bulldog Francês', sexo: 'Macho', nasc: '2022-08-30', idade: 3, un: 'anos', temp: 'Brincalhão e Teimoso', porte: 'Pequeno', pel: 'Fulvo Curta', castrado: 1, chip: '981098102345681', plano: 'Petlove Saúde' },
      // Tutor 7: Marcos
      { resp: tutorIds[7], nome: 'Simba', especie: 'Gato', raca: 'SRD', sexo: 'Macho', nasc: '2021-12-01', idade: 4, un: 'anos', temp: 'Independente', porte: 'Médio', pel: 'Amarelo Tigrado', castrado: 1, chip: '981098102345682', plano: 'Particular' },
      { resp: tutorIds[7], nome: 'Athena', especie: 'Cachorro', raca: 'Doberman', sexo: 'Fêmea', nasc: '2023-06-15', idade: 2, un: 'anos', temp: 'Inteligente e Atenta', porte: 'Grande', pel: 'Preta e Canela', castrado: 1, chip: '981098102345683', plano: 'Particular' },
      // Tutores Inativos (6+ meses)
      { resp: tutorIds[8], nome: 'Marley', especie: 'Cachorro', raca: 'Labrador Retriever', sexo: 'Macho', nasc: '2018-01-20', idade: 7, un: 'anos', temp: 'Mansinho', porte: 'Grande', pel: 'Chocolate', castrado: 1, chip: '981098102345684', plano: 'Particular' },
      { resp: tutorIds[9], nome: 'Nina', especie: 'Gato', raca: 'Angorá', sexo: 'Fêmea', nasc: '2020-11-10', idade: 5, un: 'anos', temp: 'Tímida', porte: 'Pequeno', pel: 'Branca', castrado: 1, chip: '981098102345685', plano: 'Particular' }
    ];

    const animalIds = [];
    for (const a of listaAnimais) {
      const resA = await db.run(`
        INSERT INTO animais (
          clinica_id, responsavel_id, nome, microchip, especie, raca, sexo,
          nascimento, idade, idade_unidade, temperamento, porte, pelagem,
          castrado, plano_saude, carteirinha_numero, carteirinha_validade,
          alergias, doencas_cronicas, obito
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [
        clinicaId, a.resp, a.nome, a.chip, a.especie, a.raca, a.sexo,
        a.nasc, a.idade, a.un, a.temp, a.porte, a.pel, a.castrado,
        a.plano, `CARTEIRA-${Math.floor(100000 + Math.random() * 900000)}`, '2027-12-31',
        a.nome === 'Mel' ? 'Alergia severa a proteína de frango e corantes' : (a.nome === 'Bob' ? 'Dermatite atópica sazonal' : 'Nenhuma conhecida'),
        a.nome === 'Bolinha' ? 'Discreta insuficiência mitral estágio B1' : (a.nome === 'Marley' ? 'Displasia coxofemoral leve' : 'Nenhuma')
      ]);
      animalIds.push(resA.lastID);
    }

    // Mapeamento de nomes para IDs
    const petMap = {};
    listaAnimais.forEach((a, i) => {
      petMap[a.nome] = animalIds[i];
    });

    const hoje = new Date().toISOString().split('T')[0];
    const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const depoisAmanha = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

    // 8. Agendamentos de Hoje e Próximos Dias
    console.log("📅 Criando agenda do dia e da semana...");
    const agenda = [
      // Hoje
      { pet: petMap['Mel'], data: hoje, hora: '08:30', servico: 'Consulta Dermatológica', status: 'Concluído', obs: 'Retorno com exames dermatológicos anteriores.' },
      { pet: petMap['Thor'], data: hoje, hora: '09:30', servico: 'Vacinação V10 + Raiva', status: 'Em Atendimento', obs: 'Reforço anual de vacinação e aplicação de Bravecto.' },
      { pet: petMap['Chico'], data: hoje, hora: '10:45', servico: 'Retorno Clínico', status: 'Aguardando', obs: 'Revisão pós-tratamento de otite bilateral.' },
      { pet: petMap['Bob'], data: hoje, hora: '14:00', servico: 'Avaliação Respiratória', status: 'Agendado', obs: 'Tutor relata cansaço fácil e ronco acentuado.' },
      { pet: petMap['Mia'], data: hoje, hora: '15:30', servico: 'Exame de Ultrassom', status: 'Agendado', obs: 'Jejum prévio de 8 horas confirmado pelo tutor.' },
      { pet: petMap['Frederico'], data: hoje, hora: '17:00', servico: 'Check-up Felino', status: 'Agendado', obs: 'Avaliação preventiva anual e pesagem.' },
      // Amanhã
      { pet: petMap['Apolo'], data: amanha, hora: '09:00', servico: 'Avaliação Pré-Cirúrgica', status: 'Agendado', obs: 'Coleta de sangue para perfil pré-anestésico.' },
      { pet: petMap['Pipoca'], data: amanha, hora: '11:00', servico: 'Vacinação Gripe Canina', status: 'Agendado', obs: 'Aplicação Nobivac KC intranasal.' },
      { pet: petMap['Athena'], data: amanha, hora: '14:30', servico: 'Consulta Geral e Pediatria', status: 'Agendado', obs: 'Acompanhamento de desenvolvimento ósseo.' },
      // Depois de amanhã
      { pet: petMap['Luna'], data: depoisAmanha, hora: '10:00', servico: 'Consulta Oftalmológica', status: 'Agendado', obs: 'Discreta secreção ocular no olho direito.' },
      { pet: petMap['Simba'], data: depoisAmanha, hora: '15:00', servico: 'Vacinação Quádrupla Felina', status: 'Agendado', obs: 'Reforço V4.' }
    ];

    for (const ag of agenda) {
      await db.run(`
        INSERT INTO agendamentos (
          clinica_id, animal_id, data, horario, tipo_servico, status, domiciliar, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `, [clinicaId, ag.pet, ag.data, ag.hora, ag.servico, ag.status, ag.obs]);
    }

    // 9. Internação Hospitalar
    console.log("🏥 Criando pacientes internados com sinais vitais e prontuário hospitalar...");
    
    // Zeus (Rottweiler)
    const resInternacao1 = await db.run(`
      INSERT INTO internacoes (
        clinica_id, animal_id, data_entrada, motivo, observacoes, status
      ) VALUES (
        ?, ?, ?,
        'Pós-operatório de osteossíntese de fêmur esquerdo (placa bloqueada). Monitoramento rigoroso de analgesia, curativo compressivo e fluidoterapia.',
        'Animal de porte grande, bem adaptado na baia de recuperação. Não manipular o membro operado bruscamente.',
        'ativo'
      )
    `, [clinicaId, petMap['Zeus'], `${hoje} 07:30`]);
    const internacaoZeusId = resInternacao1.lastID;

    const medsZeus = [
      { med: 'Cefalotina 1g IV', dose: '1.2g diluído em SF 100ml', hora: '08:00', status: 'aplicado', aplicado: `${hoje} 08:05` },
      { med: 'Cefalotina 1g IV', dose: '1.2g diluído em SF 100ml', hora: '16:00', status: 'pendente', aplicado: null },
      { med: 'Cefalotina 1g IV', dose: '1.2g diluído em SF 100ml', hora: '00:00', status: 'pendente', aplicado: null },
      { med: 'Cloridrato de Tramadol 50mg/ml', dose: '4.0ml IV lento', hora: '08:00', status: 'aplicado', aplicado: `${hoje} 08:10` },
      { med: 'Cloridrato de Tramadol 50mg/ml', dose: '4.0ml IV lento', hora: '16:00', status: 'pendente', aplicado: null },
      { med: 'Dipirona Sódica 500mg/ml', dose: '4.2ml IV', hora: '08:00', status: 'aplicado', aplicado: `${hoje} 08:15` },
      { med: 'Dipirona Sódica 500mg/ml', dose: '4.2ml IV', hora: '14:00', status: 'pendente', aplicado: null },
      { med: 'Dipirona Sódica 500mg/ml', dose: '4.2ml IV', hora: '20:00', status: 'pendente', aplicado: null }
    ];
    for (const m of medsZeus) {
      await db.run(`
        INSERT INTO internacao_medicacoes (
          internacao_id, medicamento, dosagem, horario_agendado, data_agendada, status, aplicado_em, usuario_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [internacaoZeusId, m.med, m.dose, m.hora, hoje, m.status, m.aplicado, vetRafaelId]);
    }

    await db.run(`
      INSERT INTO internacao_sinais_vitais (
        internacao_id, temperatura, frequencia_cardiaca, frequencia_respiratoria, peso, observacao, usuario_id
      ) VALUES (?, 38.3, 105, 22, 43.0, 'Acordou bem do plano anestésico. Mucosas normocoradas, pulso forte, sem sangramento no dreno cirúrgico.', ?)
    `, [internacaoZeusId, vetRafaelId]);
    await db.run(`
      INSERT INTO internacao_sinais_vitais (
        internacao_id, temperatura, frequencia_cardiaca, frequencia_respiratoria, peso, observacao, usuario_id
      ) VALUES (?, 38.5, 96, 20, 43.0, 'Animal calmo no leito, urinou espontaneamente, aceitou 200ml de água, escala de dor 1/10 (confortável).', ?)
    `, [internacaoZeusId, vetCamilaId]);

    // Bolinha (Poodle)
    const resInternacao2 = await db.run(`
      INSERT INTO internacoes (
        clinica_id, animal_id, data_entrada, motivo, observacoes, status
      ) VALUES (
        ?, ?, ?,
        'Gastroenterite hemorrágica aguda. Desidratação 6% e vômitos repetidos nas últimas 12h. Em fluidoterapia com Ringer Lactato.',
        'Acesso venoso periférico em membro torácico esquerdo com cateter 24G. Manter jejum hídrico e alimentar por 6h.',
        'ativo'
      )
    `, [clinicaId, petMap['Bolinha'], `${hoje} 09:15`]);
    const internacaoBolinhaId = resInternacao2.lastID;

    const medsBolinha = [
      { med: 'Ondansetrona 2mg/ml', dose: '0.8ml IV lento', hora: '09:30', status: 'aplicado', aplicado: `${hoje} 09:35` },
      { med: 'Ondansetrona 2mg/ml', dose: '0.8ml IV lento', hora: '17:30', status: 'pendente', aplicado: null },
      { med: 'Omeprazol Injetável 40mg', dose: '1.2ml IV diluído', hora: '10:00', status: 'aplicado', aplicado: `${hoje} 10:05` },
      { med: 'Metronidazol 5mg/ml Bolsa', dose: '15ml IV em infusão 30min', hora: '10:30', status: 'aplicado', aplicado: `${hoje} 10:35` },
      { med: 'Metronidazol 5mg/ml Bolsa', dose: '15ml IV em infusão 30min', hora: '22:30', status: 'pendente', aplicado: null }
    ];
    for (const m of medsBolinha) {
      await db.run(`
        INSERT INTO internacao_medicacoes (
          internacao_id, medicamento, dosagem, horario_agendado, data_agendada, status, aplicado_em, usuario_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [internacaoBolinhaId, m.med, m.dose, m.hora, hoje, m.status, m.aplicado, vetCamilaId]);
    }

    await db.run(`
      INSERT INTO internacao_sinais_vitais (
        internacao_id, temperatura, frequencia_cardiaca, frequencia_respiratoria, peso, observacao, usuario_id
      ) VALUES (?, 37.9, 130, 26, 4.8, 'Chegou com hipovolemia leve, TPC 2.5 seg. Iniciado bólus de reposição hidroeletrolítica.', ?)
    `, [internacaoBolinhaId, vetCamilaId]);
    await db.run(`
      INSERT INTO internacao_sinais_vitais (
        internacao_id, temperatura, frequencia_cardiaca, frequencia_respiratoria, peso, observacao, usuario_id
      ) VALUES (?, 38.2, 114, 22, 4.9, 'Excelente resposta inicial à fluidoterapia. Sem novos vômitos.', ?)
    `, [internacaoBolinhaId, vetCamilaId]);

    // 10. Exames Laboratoriais e de Imagem
    console.log("🔬 Inserindo exames pendentes e concluídos com laudos completos...");
    // Pendentes
    await db.run(`
      INSERT INTO exames (clinica_id, animal_id, tipo_exame, data_solicitacao, status, laboratorio)
      VALUES (?, ?, 'Hemograma Completo + Painel Hepato-Renal', ?, 'pendente', 'LabVet Central Especializado')
    `, [clinicaId, petMap['Thor'], hoje]);

    await db.run(`
      INSERT INTO exames (clinica_id, animal_id, tipo_exame, data_solicitacao, status, laboratorio)
      VALUES (?, ?, 'Ultrassonografia Abdominal Total', ?, 'pendente', 'VetCare Centro de Imagem 24h')
    `, [clinicaId, petMap['Mia'], hoje]);

    await db.run(`
      INSERT INTO exames (clinica_id, animal_id, tipo_exame, data_solicitacao, status, laboratorio)
      VALUES (?, ?, 'Citologia Otológica e Raspado Cutâneo', ?, 'pendente', 'DermatoVet Diagnósticos')
    `, [clinicaId, petMap['Bob'], hoje]);

    // Concluídos com laudo
    await db.run(`
      INSERT INTO exames (
        clinica_id, animal_id, tipo_exame, data_solicitacao, data_resultado,
        laboratorio, resultado, status
      ) VALUES (
        ?, ?, 'Ecocardiograma com Doppler a Cores', '2026-08-20', '2026-08-20',
        'CardioVet Diagnósticos',
        'Conclusão: Discreta degeneração mixomatosa da valva mitral (Estágio B1 - ACVIM). Dimensões atriais e ventriculares preservadas para a espécie. Fração de ejeção: 68% (normal). Sem hipertensão pulmonar.',
        'concluido'
      )
    `, [clinicaId, petMap['Bolinha']]);

    await db.run(`
      INSERT INTO exames (
        clinica_id, animal_id, tipo_exame, data_solicitacao, data_resultado,
        laboratorio, resultado, status
      ) VALUES (
        ?, ?, 'Exame Parasitológico de Fezes (MIF + Flutuação)', '2026-08-15', '2026-08-16',
        'LabVet Central Especializado',
        'Conclusão: Ausência de ovos de helmintos ou cistos de protozoários. Pesquisa de Giardia sp. por ELISA: NEGATIVO.',
        'concluido'
      )
    `, [clinicaId, petMap['Mel']]);

    // 11. Estoque & Serviços
    console.log("📦 Inserindo catálogo de produtos, medicamentos, vacinas e insumos...");
    const produtos = [
      // Alerta de Estoque Baixo (quantidade <= estoqueMinimo)
      { nome: 'Vacina V10 Vanguard Plus', cat: 'Vacinas', un: 'dose', qtd: 3, min: 12, custo: '42.00', venda: '115.00', fornecedor: 'Zoetis Saúde Animal', lote: 'ZG8812', exp: '2027-05-15' },
      { nome: 'Meloxicam 2mg Comprimidos (Blister 10cp)', cat: 'Medicamentos', un: 'cx', qtd: 2, min: 8, custo: '14.50', venda: '45.00', fornecedor: 'Ourofino Pet', lote: 'OF2024A', exp: '2027-08-30' },
      { nome: 'Luvas Cirúrgicas Estéreis 7.5', cat: 'Insumos', un: 'par', qtd: 4, min: 20, custo: '3.10', venda: '9.00', fornecedor: 'MedSupply Hospitalar', lote: 'MS9901', exp: '2028-01-10' },
      
      // Estoque Saudável
      { nome: 'Vacina Antirrábica Defensor', cat: 'Vacinas', un: 'dose', qtd: 50, min: 10, custo: '18.00', venda: '65.00', fornecedor: 'Zoetis', lote: 'ZT4431', exp: '2027-11-20' },
      { nome: 'Vacina Quádrupla Felina Felocell 4', cat: 'Vacinas', un: 'dose', qtd: 28, min: 8, custo: '38.00', venda: '105.00', fornecedor: 'Zoetis', lote: 'ZT9081', exp: '2027-09-12' },
      { nome: 'Antipulgas Bravecto 20 a 40kg', cat: 'Medicamentos', un: 'un', qtd: 16, min: 4, custo: '190.00', venda: '295.00', fornecedor: 'MSD Saúde Animal', lote: 'BR5521', exp: '2027-12-05' },
      { nome: 'Antipulgas Simparic 10 a 20kg', cat: 'Medicamentos', un: 'un', qtd: 22, min: 5, custo: '75.00', venda: '135.00', fornecedor: 'Zoetis', lote: 'SP1209', exp: '2027-10-18' },
      { nome: 'Amoxicilina + Clavulanato 250mg Synulox', cat: 'Medicamentos', un: 'cx', qtd: 24, min: 6, custo: '65.00', venda: '120.00', fornecedor: 'Zoetis', lote: 'SY7720', exp: '2027-07-22' },
      { nome: 'Dipirona Sódica Gotas 500mg/ml 20ml', cat: 'Medicamentos', un: 'frasco', qtd: 35, min: 8, custo: '7.80', venda: '28.00', fornecedor: 'Ibasa', lote: 'IB8831', exp: '2028-03-14' },
      { nome: 'Ringer com Lactato 500ml Bolsa', cat: 'Insumos', un: 'bolsa', qtd: 75, min: 15, custo: '8.50', venda: '32.00', fornecedor: 'Fresenius Kabi', lote: 'FK4411', exp: '2027-06-30' },
      { nome: 'Seringas Descartáveis 3ml c/ Agulha', cat: 'Insumos', un: 'un', qtd: 400, min: 60, custo: '0.45', venda: '2.50', fornecedor: 'BD Medical', lote: 'BD8871', exp: '2029-01-01' },
      { nome: 'Ração Royal Canin Gastrointestinal 2kg', cat: 'Alimentação', un: 'un', qtd: 15, min: 4, custo: '130.00', venda: '210.00', fornecedor: 'Royal Canin Brasil', lote: 'RC3391', exp: '2027-04-10' },
      { nome: 'Ração Hill Prescription Diet c/d Gatos 1.5kg', cat: 'Alimentação', un: 'un', qtd: 12, min: 3, custo: '145.00', venda: '235.00', fornecedor: 'Hills Pet', lote: 'HL8811', exp: '2027-03-25' },
      { nome: 'Shampoo Clorexidina 2% Antisséptico 500ml', cat: 'Higiene', un: 'frasco', qtd: 18, min: 5, custo: '28.00', venda: '62.00', fornecedor: 'Dr. Clean Vet', lote: 'DC5501', exp: '2028-02-15' },
      
      // Procedimentos / Serviços Clínicos
      { nome: 'Consulta Clínica Geral', cat: 'Serviços', un: 'serv', qtd: 999, min: 1, custo: '0.00', venda: '160.00', fornecedor: 'Interno', lote: 'SERV', exp: '2099-12-31' },
      { nome: 'Consulta Emergencial Plantão 24h', cat: 'Serviços', un: 'serv', qtd: 999, min: 1, custo: '0.00', venda: '260.00', fornecedor: 'Interno', lote: 'SERV', exp: '2099-12-31' },
      { nome: 'Diária de Internação Monitorada', cat: 'Serviços', un: 'diaria', qtd: 999, min: 1, custo: '0.00', venda: '250.00', fornecedor: 'Interno', lote: 'SERV', exp: '2099-12-31' },
      { nome: 'Procedimento de Castração Eletiva', cat: 'Serviços', un: 'cirurg', qtd: 999, min: 1, custo: '0.00', venda: '550.00', fornecedor: 'Interno', lote: 'SERV', exp: '2099-12-31' },
      { nome: 'Banho Hidratante + Tosa Higiênica', cat: 'Serviços', un: 'serv', qtd: 999, min: 1, custo: '0.00', venda: '95.00', fornecedor: 'Interno', lote: 'SERV', exp: '2099-12-31' }
    ];

    for (const p of produtos) {
      const margem = p.custo > 0 ? `${Math.round(((p.venda - p.custo) / p.custo) * 100)}%` : '100%';
      await db.run(`
        INSERT INTO servicos (
          clinica_id, nome, quantidade, estoqueMinimo, unidade,
          precoCusto, precoVenda, margemLucro, categoria, fornecedor,
          fabricante, lote, dataExpiracao, observacoes, codigoBarras
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        clinicaId, p.nome, p.qtd, p.min, p.un, p.custo, p.venda, margem,
        p.cat, p.fornecedor, p.fornecedor, p.lote, p.exp,
        `Produto cadastrado no estoque da matriz`, `789${Math.floor(1000000000 + Math.random() * 9000000000)}`
      ]);
    }

    // 12. Prontuários Médicos Detalhados
    console.log("📝 Inserindo prontuários clínicos e histórico médico...");
    const prontuarios = [
      {
        pet: petMap['Thor'], petNome: 'Thor', tutorNome: 'Beatriz Albuquerque',
        vet: 'Dra. Camila Rocha', vetId: vetCamilaId, data: hoje, peso: 34.2, temp: 38.4,
        sintomas: 'Animal compareceu hígido para protocolo vacinal anual e pesagem de rotina.',
        diagnostico: 'Exame físico clínico sem alterações. Mucosas normocoradas, linfonodos normais, ausculta cardiopulmonar limpa.',
        tratamento: 'Aplicado vacina V10 (Zoetis lote ZG8812) subcutânea interescapular e Raiva (Zoetis lote ZT4431).',
        prescricao: 'Bravecto mastigável 20-40kg em dose única com alimento.',
        obs: 'Próximo retorno para vacinas em 12 meses.'
      },
      {
        pet: petMap['Bolinha'], petNome: 'Bolinha', tutorNome: 'Rodrigo Mendonça',
        vet: 'Dra. Camila Rocha', vetId: vetCamilaId, data: hoje, peso: 4.8, temp: 37.9,
        sintomas: 'Vômitos aquosos amarelados (4 episódios) e prostração súbita.',
        diagnostico: 'Quadro clínico compatível com gastroenterite hemorrágica inicial e desidratação 6%.',
        tratamento: 'Fluidoterapia intravenosa com Ringer Lactato 40ml/h, antiemético Ondansetrona e protetor Omeprazol.',
        prescricao: 'Dieta Gastrointestinal após 8 horas de remissão emética.',
        obs: 'Paciente encaminhado à internação para acompanhamento continuado.'
      },
      {
        pet: petMap['Zeus'], petNome: 'Zeus', tutorNome: 'Carlos Eduardo Lima',
        vet: 'Dr. Rafael Mendes', vetId: vetRafaelId, data: hoje, peso: 43.0, temp: 38.3,
        sintomas: 'Claudicação grau 4 em membro pélvico esquerdo após trauma em corrida.',
        diagnostico: 'Fratura simples transversa de diáfise femoral esquerda confirmada por RX digital.',
        tratamento: 'Realizada osteossíntese femoral com placa 3.5mm bloqueada e 8 parafusos corticais de titânio.',
        prescricao: 'Cefalotina 1g IV, Tramadol 50mg IV e Dipirona 500mg IV.',
        obs: 'Cirurgia sem intercorrências anestésicas. RX pós-operatório demonstrou perfeito alinhamento anatômico.'
      },
      {
        pet: petMap['Mel'], petNome: 'Mel', tutorNome: 'Juliana Zanetti',
        vet: 'Dra. Camila Rocha', vetId: vetCamilaId, data: '2026-08-25', peso: 5.4, temp: 38.6,
        sintomas: 'Prurido intenso nas patas, lamber compulsivo e eritema em abdômen.',
        diagnostico: 'Dermatite atópica / Alergia alimentar canina.',
        tratamento: 'Iniciado Oclacitinib (Apoquel) 3.6mg e banhos terapêuticos com xampu clorexidina 2%.',
        prescricao: 'Apoquel 3.6mg - 1 cp BID por 14 dias; Xampu Clorexidina 2x por semana.',
        obs: 'Melhora expressiva de 80% do prurido relatada pelo tutor.'
      }
    ];

    for (const pr of prontuarios) {
      await db.run(`
        INSERT INTO prontuarios (
          clinica_id, animal_id, pet_nome, tutor_nome, veterinario, veterinario_id,
          data_visita, peso, temperatura, proxima_visita, sintomas, diagnostico,
          tratamento, prescricoes, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        clinicaId, pr.pet, pr.petNome, pr.tutorNome, pr.vet, pr.vetId,
        pr.data, pr.peso, pr.temp, amanha, pr.sintomas, pr.diagnostico,
        pr.tratamento, pr.prescricao, pr.obs
      ]);
    }

    // 13. Vacinas Aplicadas & Campanhas de Vacinação do CRM
    console.log("💉 Inserindo histórico vacinal e próximas doses para engajamento CRM...");
    const vacinas = [
      // Aplicada hoje
      { pet: petMap['Thor'], nome: 'Vacina V10 Polivalente', data: hoje, prox: '2027-09-05', lote: 'ZG8812', fab: 'Zoetis' },
      { pet: petMap['Thor'], nome: 'Vacina Antirrábica Defensor', data: hoje, prox: '2027-09-05', lote: 'ZT4431', fab: 'Zoetis' },
      // Vacinas com vencimento nos próximos 13 a 22 dias (alimentam as campanhas de vacinação do CRM!)
      { pet: petMap['Mel'], nome: 'Vacina Gripe Canina (Pneumodog)', data: '2025-09-18', prox: new Date(Date.now() + 86400000 * 13).toISOString().split('T')[0], lote: 'PN2025', fab: 'Boehringer' },
      { pet: petMap['Pipoca'], nome: 'Vacina Giardia (Giardiavax)', data: '2025-09-22', prox: new Date(Date.now() + 86400000 * 17).toISOString().split('T')[0], lote: 'GD9912', fab: 'Zoetis' },
      { pet: petMap['Apolo'], nome: 'Vacina V10 Polivalente', data: '2025-09-27', prox: new Date(Date.now() + 86400000 * 22).toISOString().split('T')[0], lote: 'VG7712', fab: 'Zoetis' },
      // Outras vacinas do histórico
      { pet: petMap['Mia'], nome: 'Vacina Quádrupla Felina Felocell', data: '2026-03-10', prox: '2027-03-10', lote: 'FC3312', fab: 'Zoetis' },
      { pet: petMap['Chico'], nome: 'Vacina V10 Polivalente', data: '2026-01-15', prox: '2027-01-15', lote: 'VG1109', fab: 'Zoetis' }
    ];

    for (const v of vacinas) {
      await db.run(`
        INSERT INTO vacinas (
          clinica_id, animal_id, nome_vacina, data_aplicacao, proxima_dose, lote, fabricante, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Aplicação subcutânea realizada na clínica com sucesso.')
      `, [clinicaId, v.pet, v.nome, v.data, v.prox, v.lote, v.fab]);
    }

    // 14. Consultas de Retorno
    console.log("🔄 Inserindo agendamentos de retorno...");
    const retornos = [
      { pet: petMap['Chico'], petNome: 'Chico', tutorNome: 'Fernanda Vasconcelos', data: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], hora: '14:30', motivo: 'Avaliação citológica pós-otite', status: 'Pendentes' },
      { pet: petMap['Mel'], petNome: 'Mel', tutorNome: 'Juliana Zanetti', data: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0], hora: '10:00', motivo: 'Reavaliação dermatológica Apoquel', status: 'Pendentes' },
      { pet: petMap['Zeus'], petNome: 'Zeus', tutorNome: 'Carlos Eduardo Lima', data: new Date(Date.now() + 86400000 * 12).toISOString().split('T')[0], hora: '16:00', motivo: 'Retirada de pontos pós-osteossíntese e RX', status: 'Pendentes' }
    ];

    for (const r of retornos) {
      await db.run(`
        INSERT INTO retornos (
          clinica_id, animal_id, pet_nome, tutor_nome, data_retorno, horario, motivo, observacoes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Retorno com atendimento gratuito incluso no procedimento.', ?)
      `, [clinicaId, r.pet, r.petNome, r.tutorNome, r.data, r.hora, r.motivo, r.status]);
    }

    // 15. Receituários Emitidos
    console.log("💊 Inserindo receituários veterinários impressos...");
    await db.run(`
      INSERT INTO receituario (
        clinica_id, animal_id, tutor_id, data_emissao, medicamentos, posologia,
        observacoes, validade, medico_responsavel, crmv
      ) VALUES (
        ?, ?, ?, ?,
        '1. Apoquel (Oclacitinib) 3.6mg - 1 Caixa\n2. Ômega 3 Dog 500mg - 1 Frasco\n3. Clorexiderm Shampoo 2% - 1 Frasco',
        '1. Fornecer 1 comprimido por via oral a cada 12 horas durante 14 dias seguidos.\n2. Administrar 1 cápsula junto à ração uma vez ao dia por 60 dias.\n3. Realizar banhos semanais com tempo de contato de 10 minutos na pele.',
        'Caso surjam vômitos ou fezes pastosas, suspender temporariamente e contatar a clínica.',
        '30 dias', 'Dra. Camila Rocha', 'CRMV-SP 45.892'
      )
    `, [clinicaId, petMap['Mel'], tutorIds[4], hoje]);

    await db.run(`
      INSERT INTO receituario (
        clinica_id, animal_id, tutor_id, data_emissao, medicamentos, posologia,
        observacoes, validade, medico_responsavel, crmv
      ) VALUES (
        ?, ?, ?, ?,
        '1. Cefalexina 500mg Comprimidos\n2. Meloxicam 2mg Comprimidos\n3. Dipirona Gotas 500mg/ml',
        '1. 1 comprimido e meio a cada 12 horas durante 10 dias.\n2. 1 comprimido uma vez ao dia após a refeição por 5 dias.\n3. 35 gotas a cada 8 horas se dor ou febre por 3 dias.',
        'Manter repouso absoluto no leito, sem pular ou correr.',
        '15 dias', 'Dr. Rafael Mendes', 'CRMV-SP 41.205'
      )
    `, [clinicaId, petMap['Zeus'], tutorIds[3], hoje]);

    // 16. Orçamentos
    console.log("📑 Inserindo orçamentos clínicos e cirúrgicos...");
    const itensOrcZeus = JSON.stringify([
      { descricao: 'Procedimento Cirúrgico Osteossíntese Femoral Complexa', valor: 2800.00, qtd: 1 },
      { descricao: 'Anestesia Geral Inalatória Monitorada', valor: 650.00, qtd: 1 },
      { descricao: 'Diária de Internação em UTI Monitorada (2 dias)', valor: 500.00, qtd: 2 },
      { descricao: 'Kit Cirúrgico Estéril e Medicamentos Transoperatórios', valor: 350.00, qtd: 1 },
      { descricao: 'Controle Radiológico Pós-Operatório Digital', valor: 160.00, qtd: 1 }
    ]);
    await db.run(`
      INSERT INTO orcamentos (
        clinica_id, animal_id, tutor_nome, pet_nome, data_emissao, validade, status,
        observacoes, itens, total
      ) VALUES (
        ?, ?, 'Carlos Eduardo Lima', 'Zeus', ?, ?, 'Aprovado',
        'Orçamento aprovado pelo tutor com pagamento parcelado em 4x no cartão.',
        ?, 4460.00
      )
    `, [clinicaId, petMap['Zeus'], hoje, new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0], itensOrcZeus]);

    const itensOrcMia = JSON.stringify([
      { descricao: 'Profilaxia Odontal com Ultrassom e Polimento', valor: 450.00, qtd: 1 },
      { descricao: 'Anestesia Inalatória com Isoflurano', valor: 380.00, qtd: 1 },
      { descricao: 'Exames Pré-operatórios (Hemograma e Eletrocardiograma)', valor: 220.00, qtd: 1 }
    ]);
    await db.run(`
      INSERT INTO orcamentos (
        clinica_id, animal_id, tutor_nome, pet_nome, data_emissao, validade, status,
        observacoes, itens, total
      ) VALUES (
        ?, ?, 'Fernanda Vasconcelos', 'Mia', ?, ?, 'Pendente',
        'Aguardando confirmação de data conveniente para a tutora.',
        ?, 1050.00
      )
    `, [clinicaId, petMap['Mia'], hoje, new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0], itensOrcMia]);

    // 17. Banho & Tosa
    console.log("✂️ Inserindo agendamentos de Estética Animal e Banho & Tosa...");
    await db.run(`
      INSERT INTO banho_tosa (
        clinica_id, animal_id, data, horario, pacote_mensal, status, observacoes
      ) VALUES (?, ?, ?, '10:00', 1, 'Em Andamento', 'Tosa da raça tesoura + Hidratação profunda com óleo de argan.')
    `, [clinicaId, petMap['Pipoca'], hoje]);

    await db.run(`
      INSERT INTO banho_tosa (
        clinica_id, animal_id, data, horario, pacote_mensal, status, observacoes
      ) VALUES (?, ?, ?, '14:00', 0, 'Aguardando', 'Banho terapêutico dermatológico Clorexidina + corte de unhas.')
    `, [clinicaId, petMap['Mel'], hoje]);

    await db.run(`
      INSERT INTO banho_tosa (
        clinica_id, animal_id, data, horario, pacote_mensal, status, observacoes
      ) VALUES (?, ?, ?, '11:00', 1, 'Aguardando', 'Escovação de subpelo Maine Coon e higienização auricular.')
    `, [clinicaId, petMap['Frederico'], amanha]);

    // 18. Histórico Financeiro Completo (Últimos 6 Meses para o Gráfico de Desempenho + Mês Atual)
    console.log("📊 Gerando fluxo financeiro completo (6 meses históricos + entradas de hoje)...");
    
    // 5 Meses Anteriores
    for (let i = 5; i >= 1; i--) {
      const dataMes = new Date();
      dataMes.setMonth(dataMes.getMonth() - i);
      
      const ano = dataMes.getFullYear();
      const mes = String(dataMes.getMonth() + 1).padStart(2, '0');
      
      const faturamentoBase = 22000 + (5 - i) * 3500;
      await db.run(`
        INSERT INTO financeiro (clinica_id, descricao, categoria, valor, tipo, data, metodo_pagamento, observacoes)
        VALUES (?, 'Faturamento de Consultas e Procedimentos Clínicos', 'Consultas', ?, 'entrada', ?, 'Cartão de Crédito', 'Faturamento mensal consolidado')
      `, [clinicaId, faturamentoBase * 0.55, `${ano}-${mes}-10T14:00:00`]);

      await db.run(`
        INSERT INTO financeiro (clinica_id, descricao, categoria, valor, tipo, data, metodo_pagamento, observacoes)
        VALUES (?, 'Procedimentos Cirúrgicos e Anestesia', 'Cirurgias', ?, 'entrada', ?, 'PIX', 'Cirurgias eletivas e urgências')
      `, [clinicaId, faturamentoBase * 0.30, `${ano}-${mes}-18T18:30:00`]);

      await db.run(`
        INSERT INTO financeiro (clinica_id, descricao, categoria, valor, tipo, data, metodo_pagamento, observacoes)
        VALUES (?, 'Vendas de Farmácia e Pet Shop', 'Produtos', ?, 'entrada', ?, 'Cartão de Débito', 'Vendas de balcão')
      `, [clinicaId, faturamentoBase * 0.15, `${ano}-${mes}-25T11:00:00`]);

      const despesaBase = 9000 + (5 - i) * 1200;
      await db.run(`
        INSERT INTO financeiro (clinica_id, descricao, categoria, valor, tipo, data, metodo_pagamento, observacoes)
        VALUES (?, 'Folha de Pagamento da Equipe', 'Salários', ?, 'saida', ?, 'Transferência Bancária', 'Salários colaboradores')
      `, [clinicaId, despesaBase * 0.50, `${ano}-${mes}-05T10:00:00`]);

      await db.run(`
        INSERT INTO financeiro (clinica_id, descricao, categoria, valor, tipo, data, metodo_pagamento, observacoes)
        VALUES (?, 'Fornecedores de Medicamentos e Insumos', 'Estoque', ?, 'saida', ?, 'Boleto', 'Reposição mensal estoque')
      `, [clinicaId, despesaBase * 0.30, `${ano}-${mes}-15T15:00:00`]);

      await db.run(`
        INSERT INTO financeiro (clinica_id, descricao, categoria, valor, tipo, data, metodo_pagamento, observacoes)
        VALUES (?, 'Aluguel, Energia e Despesas Fixas', 'Infraestrutura', ?, 'saida', ?, 'Débito Automático', 'Custos operacionais')
      `, [clinicaId, despesaBase * 0.20, `${ano}-${mes}-20T09:00:00`]);
    }

    // Mês Atual
    const transacoesMesAtual = [
      { desc: 'Cirurgia Ortopédica Zeus (Entrada)', cat: 'Cirurgias', valor: 2800.00, tipo: 'entrada', vet: vetRafaelId, met: 'Cartão de Crédito' },
      { desc: 'Anestesia Geral Zeus', cat: 'Cirurgias', valor: 650.00, tipo: 'entrada', vet: vetRafaelId, met: 'Cartão de Crédito' },
      { desc: 'Diária Internação Zeus + Monitoramento', cat: 'Internação', valor: 500.00, tipo: 'entrada', vet: vetCamilaId, met: 'PIX' },
      { desc: 'Diária Internação Bolinha + Medicação', cat: 'Internação', valor: 380.00, tipo: 'entrada', vet: vetCamilaId, met: 'PIX' },
      { desc: 'Consulta e Vacinas Thor (V10 + Raiva)', cat: 'Vacinas', valor: 295.00, tipo: 'entrada', vet: vetCamilaId, met: 'PIX' },
      { desc: 'Consulta Especialista Mel (Dermatologia)', cat: 'Consultas', valor: 220.00, tipo: 'entrada', vet: vetCamilaId, met: 'Cartão de Débito' },
      { desc: 'Venda Bravecto + Ração Royal Canin', cat: 'Produtos', valor: 505.00, tipo: 'entrada', vet: null, met: 'Cartão de Crédito' },
      { desc: 'Pacote Mensal Banho & Tosa Frederico', cat: 'Banho e Tosa', valor: 380.00, tipo: 'entrada', vet: null, met: 'PIX' },
      { desc: 'Exames Laboratoriais Mia (Painel Pré-Op)', cat: 'Exames', valor: 220.00, tipo: 'entrada', vet: vetCamilaId, met: 'PIX' },
      // Despesas do mês atual
      { desc: 'Compra de Insumos Cirúrgicos e Fios', cat: 'Estoque', valor: 1450.00, tipo: 'saida', vet: null, met: 'Boleto' },
      { desc: 'Aluguel do Imóvel da Clínica (Paulista)', cat: 'Infraestrutura', valor: 4500.00, tipo: 'saida', vet: null, met: 'PIX' },
      { desc: 'Conta de Energia Elétrica e Gerador', cat: 'Infraestrutura', valor: 890.00, tipo: 'saida', vet: null, met: 'Débito' }
    ];

    for (const tr of transacoesMesAtual) {
      const resFin = await db.run(`
        INSERT INTO financeiro (
          clinica_id, descricao, categoria, valor, tipo, data, metodo_pagamento, observacoes, veterinario_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Lançamento do sistema VetCare', ?)
      `, [clinicaId, tr.desc, tr.cat, tr.valor, tr.tipo, new Date().toISOString(), tr.met, tr.vet]);

      if (tr.vet && tr.tipo === 'entrada') {
        const comissaoValor = tr.vet === vetRafaelId ? tr.valor * 0.25 : tr.valor * 0.20;
        await db.run(`
          INSERT INTO comissoes (
            clinica_id, financeiro_id, usuario_id, valor_comissao, status, data_pagamento
          ) VALUES (?, ?, ?, ?, 'pendente', NULL)
        `, [clinicaId, resFin.lastID, tr.vet, comissaoValor]);
      }
    }

    // 19. Modelos de Documentos / Templates
    console.log("📄 Criando modelos e templates de documentos...");
    await db.run(`
      INSERT INTO templates (
        clinica_id, nome, tipo, conteudo_html, conteudo_css, ativo
      ) VALUES (
        ?, 'Receituário Oficial VetCare', 'receituario',
        '<div class="receita-header"><h2>VetCare Hospital 24h</h2><p>Av. Paulista, 1500 - São Paulo/SP</p></div><div class="receita-corpo"><p>Paciente: {{pet_nome}} ({{especie}})</p><p>Tutor: {{tutor_nome}}</p><hr/><div class="medicamentos">{{medicamentos}}</div></div>',
        '.receita-header { text-align: center; border-bottom: 2px solid #14b8a6; }',
        1
      )
    `, [clinicaId]);

    await db.run(`
      INSERT INTO templates (
        clinica_id, nome, tipo, conteudo_html, conteudo_css, ativo
      ) VALUES (
        ?, 'Termo de Consentimento para Cirurgia e Anestesia', 'contrato',
        '<div class="termo"><h2>Termo de Autorização Cirúrgica</h2><p>Eu, {{tutor_nome}}, autorizo a realização do procedimento cirúrgico no animal {{pet_nome}}...</p></div>',
        '.termo { font-size: 14px; line-height: 1.6; }',
        1
      )
    `, [clinicaId]);

    console.log("\n=======================================================");
    console.log("🎉 PERFIL DEMONSTRAÇÃO POPULADO COM SUCESSO!");
    console.log("=======================================================");
    console.log(`🏥 Clínica: VetCare Hospital Veterinário 24h (ID: ${clinicaId})`);
    console.log(`👑 Plano: hospital (Acesso 100% Ilimitado a todos os módulos)`);
    console.log(`🔑 Login 1: demo@vetcare.com | Senha: demo123`);
    console.log(`🔑 Login 2: admin@vetcare.com | Senha: admin123`);
    console.log(`👨‍⚕️ Veterinária: camila.vet@vetcare24h.com.br | Senha: demo123`);
    console.log(`👨‍⚕️ Cirurgião: rafael.vet@vetcare24h.com.br | Senha: demo123`);
    console.log(`📊 Pacientes: ${listaAnimais.length} cadastrados com histórico`);
    console.log(`👨‍👩‍👦 Tutores: ${listaTutores.length} cadastrados`);
    console.log(`📅 Agenda de Hoje: ${agenda.filter(a => a.data === hoje).length} consultas`);
    console.log(`🏥 Internação Ativa: 2 pacientes monitorados em tempo real`);
    console.log(`🔬 Exames: 3 laudos pendentes (alimentam alerta do Dashboard)`);
    console.log(`📦 Estoque: 3 itens com estoque baixo (alimentam alerta do Dashboard)`);
    console.log("=======================================================\n");

  } catch (error) {
    console.error("❌ Erro fatal ao povoar perfil demonstração:", error);
  } finally {
    await db.close();
  }
}

populateDemoProfile();
