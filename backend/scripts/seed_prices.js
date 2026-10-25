import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function seed() {
  const db = await open({
    filename: './clinica.db',
    driver: sqlite3.Database
  });

  const clinica_id = 1;

  const items = [
    // CONSULTA
    { nome: 'Consulta', categoria: 'Consulta', preco: '90,00', unidade: 'atendimento' },
    { nome: 'Consulta Domiciliar', categoria: 'Consulta', preco: '160,00', unidade: 'atendimento', obs: 'Consultar localização' },
    
    // VACINAS
    { nome: 'Vacina V8', categoria: 'Vacina', preco: '80,00', unidade: 'dose' },
    { nome: 'Vacina V10', categoria: 'Vacina', preco: '90,00', unidade: 'dose' },
    { nome: 'Vacina Giardia', categoria: 'Vacina', preco: '90,00', unidade: 'dose' },
    { nome: 'Vacina Gripe', categoria: 'Vacina', preco: '105,00', unidade: 'dose' },
    { nome: 'Vacina Raiva', categoria: 'Vacina', preco: '40,00', unidade: 'dose' },
    { nome: 'Vacina V4', categoria: 'Vacina', preco: '90,00', unidade: 'dose' },
    { nome: 'Vacina V5', categoria: 'Vacina', preco: '120,00', unidade: 'dose' },

    // TESTES RÁPIDOS (Exames)
    { nome: 'Teste Cinomose', categoria: 'Exames', preco: '90,00', unidade: 'teste' },
    { nome: 'Teste Parvovirose', categoria: 'Exames', preco: '90,00', unidade: 'teste' },
    { nome: 'Teste Giardia', categoria: 'Exames', preco: '100,00', unidade: 'teste' },
    { nome: 'Teste Fiv/Felv', categoria: 'Exames', preco: '130,00', unidade: 'teste' },

    // ULTRASSOM & RAIO X (Exames)
    { nome: 'Ultrassom', categoria: 'Exames', preco: '220,00', unidade: 'exame' },
    { nome: 'Ultrassom + Cistocentese', categoria: 'Exames', preco: '250,00', unidade: 'exame' },
    { nome: 'Raio X (1 Projeção)', categoria: 'Exames', preco: '170,00', unidade: 'exame' },
    { nome: 'Raio X (2 Projeções)', categoria: 'Exames', preco: '240,00', unidade: 'exame' },
    { nome: 'Raio X (4 Projeções)', categoria: 'Exames', preco: '380,00', unidade: 'exame' },
    { nome: 'Raio X (Projeção Adicional)', categoria: 'Exames', preco: '70,00', unidade: 'projeção' },

    // ESPECIALIDADES (Exames/Consulta)
    { nome: 'Cardiologista', categoria: 'Especialidades', preco: '500,00', unidade: 'consulta' },
    { nome: 'Medicina Felina', categoria: 'Especialidades', preco: '180,00', unidade: 'consulta' },
    { nome: 'Neurologista', categoria: 'Especialidades', preco: '420,00', unidade: 'consulta' },
    { nome: 'Oftalmologista', categoria: 'Especialidades', preco: '380,00', unidade: 'consulta' },
    { nome: 'Dermatologista', categoria: 'Especialidades', preco: '350,00', unidade: 'consulta' },
    { nome: 'Endocrinologista', categoria: 'Especialidades', preco: '300,00', unidade: 'consulta' },
    { nome: 'Nefrologista', categoria: 'Especialidades', preco: '330,00', unidade: 'consulta' },

    // SEDAÇÃO/ANESTESIA (Procedimentos)
    { nome: 'Sedação/Anestesia (até 10kg)', categoria: 'Procedimentos', preco: '140,00', unidade: 'procedimento' },
    { nome: 'Sedação/Anestesia (até 20kg)', categoria: 'Procedimentos', preco: '180,00', unidade: 'procedimento' },
    { nome: 'Sedação/Anestesia (até 30kg)', categoria: 'Procedimentos', preco: '230,00', unidade: 'procedimento' },
    { nome: 'Sedação/Anestesia (até 40kg)', categoria: 'Procedimentos', preco: '290,00', unidade: 'procedimento' },

    // APLICAÇÃO INJETÁVEIS (Procedimentos)
    { nome: 'Aplicação Injetáveis (até 10kg)', categoria: 'Procedimentos', preco: '15,00', unidade: 'aplicação' },
    { nome: 'Aplicação Injetáveis (até 20kg)', categoria: 'Procedimentos', preco: '20,00', unidade: 'aplicação' },
    { nome: 'Aplicação Injetáveis (até 30kg)', categoria: 'Procedimentos', preco: '30,00', unidade: 'aplicação' },
    { nome: 'Aplicação Injetáveis (até 40kg)', categoria: 'Procedimentos', preco: '40,00', unidade: 'aplicação' },

    // APLICAÇÃO IMIZOL (Procedimentos)
    { nome: 'Aplicação Imizol (até 5kg)', categoria: 'Procedimentos', preco: '60,00', unidade: 'aplicação' },
    { nome: 'Aplicação Imizol (até 10kg)', categoria: 'Procedimentos', preco: '70,00', unidade: 'aplicação' },
    { nome: 'Aplicação Imizol (até 15kg)', categoria: 'Procedimentos', preco: '80,00', unidade: 'aplicação' },
    { nome: 'Aplicação Imizol (até 20kg)', categoria: 'Procedimentos', preco: '90,00', unidade: 'aplicação' },
    { nome: 'Aplicação Imizol (até 30kg)', categoria: 'Procedimentos', preco: '100,00', unidade: 'aplicação' },
    { nome: 'Aplicação Imizol (até 40kg)', categoria: 'Procedimentos', preco: '110,00', unidade: 'aplicação' },

    // EUTANÁSIA (Procedimentos)
    { nome: 'Eutanásia (até 10kg)', categoria: 'Procedimentos', preco: '250,00', unidade: 'procedimento' },
    { nome: 'Eutanásia (até 20kg)', categoria: 'Procedimentos', preco: '320,00', unidade: 'procedimento' },
    { nome: 'Eutanásia (até 30kg)', categoria: 'Procedimentos', preco: '380,00', unidade: 'procedimento' },
    { nome: 'Eutanásia (até 40kg)', categoria: 'Procedimentos', preco: '420,00', unidade: 'procedimento' },

    // DESTINO (Procedimentos)
    { nome: 'Destino (até 10kg)', categoria: 'Procedimentos', preco: '180,00', unidade: 'serviço' },
    { nome: 'Destino (até 20kg)', categoria: 'Procedimentos', preco: '220,00', unidade: 'serviço' },
    { nome: 'Destino (até 30kg)', categoria: 'Procedimentos', preco: '280,00', unidade: 'serviço' },
    { nome: 'Destino (até 40kg)', categoria: 'Procedimentos', preco: '320,00', unidade: 'serviço' },

    // DIÁRIA INTERNAÇÃO (Internação)
    { nome: 'Diária Internação/Observação (até 10kg)', categoria: 'Internação', preco: '140,00', unidade: 'diária' },
    { nome: 'Diária Internação/Observação (até 20kg)', categoria: 'Internação', preco: '180,00', unidade: 'diária' },
    { nome: 'Diária Internação/Observação (até 30kg)', categoria: 'Internação', preco: '220,00', unidade: 'diária' },
    { nome: 'Diária Internação/Observação (até 40kg)', categoria: 'Internação', preco: '260,00', unidade: 'diária' },
    { nome: 'Meia Diária Internação', categoria: 'Internação', preco: 'Metade do valor', unidade: '1/2 diária' },

    // PROCEDIMENTOS
    { nome: 'Desobstrução de Gatos (com anestesia)', categoria: 'Procedimentos', preco: '400,00', unidade: 'procedimento' },
    { nome: 'Fita Glicemia', categoria: 'Procedimentos', preco: '10,00', unidade: 'un' },
    { nome: 'Sondagem Uretral para Coleta', categoria: 'Procedimentos', preco: '60,00', unidade: 'procedimento' },
    { nome: 'Eletrocardiograma', categoria: 'Procedimentos', preco: '150,00', unidade: 'exame' },
    { nome: 'Drenagem de Abscesso Simples', categoria: 'Procedimentos', preco: '100,00', unidade: 'procedimento' },
    { nome: 'Drenagem de Abscesso Complexa', categoria: 'Procedimentos', preco: '180,00', unidade: 'procedimento' },
    { nome: 'Fluidoterapia', categoria: 'Procedimentos', preco: '40,00', unidade: 'sessão' },
    { nome: 'Microchipagem', categoria: 'Procedimentos', preco: '100,00', unidade: 'un' },
    { nome: 'Aferição de Pressão Arterial', categoria: 'Procedimentos', preco: '20,00', unidade: 'aferição' },
    { nome: 'Curativo Simples Pequeno', categoria: 'Procedimentos', preco: '30,00', unidade: 'un' },
    { nome: 'Curativo Simples Médio', categoria: 'Procedimentos', preco: '50,00', unidade: 'un' },
    { nome: 'Curativo Simples Grande', categoria: 'Procedimentos', preco: '70,00', unidade: 'un' },
    { nome: 'Curativo Complexo', categoria: 'Procedimentos', preco: '100,00 - 150,00', unidade: 'un', obs: 'Consultar' },
    { nome: 'Limpeza Ferida Simples', categoria: 'Procedimentos', preco: '70,00', unidade: 'procedimento' },
    { nome: 'Limpeza Ferida Complexa/Míiase', categoria: 'Procedimentos', preco: '180,00', unidade: 'procedimento' },
    { nome: 'Limpeza Canal Auditivo', categoria: 'Procedimentos', preco: '40,00', unidade: 'procedimento' },
    { nome: 'Prolapso Retal', categoria: 'Procedimentos', preco: '450,00', unidade: 'procedimento' },
    { nome: 'Lâmpada de Wood', categoria: 'Procedimentos', preco: '40,00', unidade: 'exame' },
    { nome: 'Remoção de Espinho Ouriço', categoria: 'Procedimentos', preco: '150,00', unidade: 'procedimento' },
    { nome: 'Sutura Simples', categoria: 'Procedimentos', preco: '120,00', unidade: 'procedimento' },
    { nome: 'Sutura Complexa/Extensa', categoria: 'Procedimentos', preco: '200,00', unidade: 'procedimento' },
    { nome: 'Teste com Fluoresceína', categoria: 'Procedimentos', preco: '20,00', unidade: 'teste' },
    { nome: 'Oxigenoterapia', categoria: 'Procedimentos', preco: '120,00', unidade: 'sessão' },
    { nome: 'Cistocentese', categoria: 'Procedimentos', preco: '40,00', unidade: 'procedimento' },
    { nome: 'RCP', categoria: 'Procedimentos', preco: '250,00', unidade: 'procedimento' },
    { nome: 'Corte de Unha', categoria: 'Procedimentos', preco: '10,00', unidade: 'procedimento' },
    { nome: 'Retirada de Pontos', categoria: 'Procedimentos', preco: '20,00', unidade: 'procedimento' },

    // EXAMES DE SANGUE (Exames)
    { nome: 'Taxa de Urgência Exame', categoria: 'Exames', preco: '50,00', unidade: 'taxa' },
    { nome: 'Hemograma', categoria: 'Exames', preco: '60,00', unidade: 'exame' },
    { nome: 'Contagem de Reticulócitos', categoria: 'Exames', preco: '40,00', unidade: 'exame' },
    { nome: 'Hemograma + Hemoparasitas', categoria: 'Exames', preco: '80,00', unidade: 'exame' },
    { nome: 'Bioquímico', categoria: 'Exames', preco: '100,00', unidade: 'exame' },
    { nome: 'Bioquímico 2', categoria: 'Exames', preco: '140,00', unidade: 'exame', obs: 'Hemo, Ureia, Creat, ALT, GGT, FA, Prot, AST, Col, Glic, Trig' },
    { nome: 'Check up Completo', categoria: 'Exames', preco: '190,00', unidade: 'exame' },
    { nome: 'Perfil Básico', categoria: 'Exames', preco: '100,00', unidade: 'exame', obs: 'Hemo, Ureia, Creat, ALT' },
    { nome: 'Perfil Renal Básico', categoria: 'Exames', preco: '90,00', unidade: 'exame', obs: 'Ureia, Creat' },
    { nome: 'Perfil Renal Plus', categoria: 'Exames', preco: '120,00', unidade: 'exame', obs: 'Ureia, Creat, Fósforo' },
    { nome: 'Perfil Diabetes', categoria: 'Exames', preco: '120,00', unidade: 'exame' },
    { nome: 'Perfil Endócrino', categoria: 'Exames', preco: '190,00', unidade: 'exame' },
    { nome: 'Perfil Eletrolítico', categoria: 'Exames', preco: '130,00', unidade: 'exame' },
    { nome: 'Perfil Doença do Carrapato', categoria: 'Exames', preco: '160,00', unidade: 'exame' },
    { nome: 'Perfil Leishmaniose', categoria: 'Exames', preco: '140,00', unidade: 'exame' },
    { nome: 'Perfil Leishmaniose Acompanhamento', categoria: 'Exames', preco: '160,00', unidade: 'exame' },
    { nome: 'Cinomose (Lentz)', categoria: 'Exames', preco: '80,00', unidade: 'exame' },
    { nome: 'Painel Hemoparasita 2', categoria: 'Exames', preco: '260,00', unidade: 'exame' },
    { nome: 'Painel Hemoparasita 3', categoria: 'Exames', preco: '260,00', unidade: 'exame' },
    { nome: 'Curva Glicêmica (6 dosagens)', categoria: 'Exames', preco: '120,00', unidade: 'exame' },
    { nome: 'Coronavírus Felino (PIF)', categoria: 'Exames', preco: '280,00', unidade: 'exame' },
    { nome: 'Micoplasmose Felina', categoria: 'Exames', preco: '260,00', unidade: 'exame' },
    { nome: 'Anaplasmose', categoria: 'Exames', preco: '230,00', unidade: 'exame' },
    { nome: 'Cortisol Pós Dexa', categoria: 'Exames', preco: '180,00', unidade: 'exame' },
    { nome: 'Supressão de Dexametasona 3', categoria: 'Exames', preco: '220,00', unidade: 'exame' },
    { nome: 'Fenobarbital', categoria: 'Exames', preco: '150,00', unidade: 'exame' },
    { nome: 'Urina Rotina', categoria: 'Exames', preco: '60,00', unidade: 'exame' },
    { nome: 'Urocultura', categoria: 'Exames', preco: '150,00', unidade: 'exame' },
    { nome: 'Parasitológico Completo', categoria: 'Exames', preco: '80,00', unidade: 'exame' },
    { nome: 'Cultura Fúngica', categoria: 'Exames', preco: '130,00', unidade: 'exame' },
    { nome: 'Cultura com Antibiograma', categoria: 'Exames', preco: '160,00', unidade: 'exame' },
    { nome: 'Raspado Cutâneo', categoria: 'Exames', preco: '70,00', unidade: 'exame' },
    { nome: 'Pesquisa de Esporothrix', categoria: 'Exames', preco: '90,00', unidade: 'exame' },
    { nome: 'Citologia', categoria: 'Exames', preco: '120,00', unidade: 'exame' },
    { nome: 'Citologia de Ouvido', categoria: 'Exames', preco: '90,00', unidade: 'exame' },
    { nome: 'Pesquisa Malassezia', categoria: 'Exames', preco: '80,00', unidade: 'exame' },
    { nome: 'Sexagem de Aves', categoria: 'Exames', preco: '70,00', unidade: 'exame' },

    // MEDICAÇÕES
    { nome: 'Ômega 3 Organact', categoria: 'Medicamento', preco: '89,99', unidade: 'un' },
    { nome: 'Complett Mix', categoria: 'Medicamento', preco: '34,99', unidade: 'un' },
    { nome: 'Promun Cat', categoria: 'Medicamento', preco: '55,99', unidade: 'un' },
    { nome: 'Alergocort Shampoo', categoria: 'Medicamento', preco: '90,00', unidade: 'un' },
    { nome: 'Neodexa Creme', categoria: 'Medicamento', preco: '49,99', unidade: 'un' },
    { nome: 'Vetagloss', categoria: 'Medicamento', preco: '59,99', unidade: 'un' },
    { nome: 'Shampoo Clorex', categoria: 'Medicamento', preco: '29,99', unidade: 'un' },
    { nome: 'Hemolitan Pet Comprimidos', categoria: 'Medicamento', preco: '72,99', unidade: 'frasco' },
    { nome: 'Hemolitan Pet 30ml', categoria: 'Medicamento', preco: '44,90', unidade: 'frasco' },
    { nome: 'Meloxivet 0,5mg', categoria: 'Medicamento', preco: '24,99', unidade: 'cx' },
    { nome: 'Meloxivet 2mg', categoria: 'Medicamento', preco: '44,99', unidade: 'cx' },
    { nome: 'Aerocid', categoria: 'Medicamento', preco: '19,99', unidade: 'frasco' },
    { nome: 'Posatex', categoria: 'Medicamento', preco: '140,00', unidade: 'frasco' },
    { nome: 'Glicopan Pet 125ml', categoria: 'Medicamento', preco: '62,99', unidade: 'frasco' },
    { nome: 'Glicopan Pet 30ml', categoria: 'Medicamento', preco: '41,99', unidade: 'frasco' },
    { nome: 'Afectrim', categoria: 'Medicamento', preco: '47,99', unidade: 'frasco' },
    { nome: 'Condroplex', categoria: 'Medicamento', preco: '86,99', unidade: 'cx' },
    { nome: 'Auricularlimp', categoria: 'Medicamento', preco: '29,99', unidade: 'frasco' },
    { nome: 'Periovet', categoria: 'Medicamento', preco: '44,99', unidade: 'frasco' },
    { nome: 'Carvox Pet', categoria: 'Medicamento', preco: '29,99', unidade: 'frasco' },
    { nome: 'Pet Milk', categoria: 'Medicamento', preco: '99,90', unidade: 'un' },
    { nome: 'Enronew 50mg', categoria: 'Medicamento', preco: '22,99', unidade: 'cx' },
    { nome: 'Enronew 150mg', categoria: 'Medicamento', preco: '44,99', unidade: 'cx' },
    { nome: 'Chemital Gatos', categoria: 'Medicamento', preco: '29,99', unidade: 'cx' },
    { nome: 'Vermotrix Baby Suspensão', categoria: 'Medicamento', preco: '19,99', unidade: 'frasco' },
    { nome: 'Cefaword 150mg', categoria: 'Medicamento', preco: '44,99', unidade: 'cx' },
    { nome: 'Cefaword 300mg', categoria: 'Medicamento', preco: '69,99', unidade: 'cx' },
    { nome: 'Gaviz V', categoria: 'Medicamento', preco: '29,99', unidade: 'cx' },
    { nome: 'Canex', categoria: 'Medicamento', preco: '15,90', unidade: 'un' },
    { nome: 'Canex Giardia', categoria: 'Medicamento', preco: '36,90', unidade: 'un' },
    { nome: 'Silmox 50mg', categoria: 'Medicamento', preco: '47,99', unidade: 'cx' },
    { nome: 'Silmox 150mg', categoria: 'Medicamento', preco: '63,90', unidade: 'cx' },
    { nome: 'Silmox 300mg', categoria: 'Medicamento', preco: '79,90', unidade: 'cx' },
    { nome: 'Micodine 500ml', categoria: 'Medicamento', preco: '98,90', unidade: 'frasco' },
    { nome: 'Simparic 5mg', categoria: 'Medicamento', preco: '62,90', unidade: 'un' },
    { nome: 'Simparic 10mg', categoria: 'Medicamento', preco: '64,90', unidade: 'un' },
    { nome: 'Simparic 20mg', categoria: 'Medicamento', preco: '74,90', unidade: 'un' },
    { nome: 'Simparic 40mg', categoria: 'Medicamento', preco: '84,90', unidade: 'un' },
    { nome: 'Simparic 80mg', categoria: 'Medicamento', preco: '96,80', unidade: 'un' },
    { nome: 'Simparic 120mg', categoria: 'Medicamento', preco: '116,50', unidade: 'un' },
    { nome: 'Revolution Plus 6 cx/3', categoria: 'Medicamento', preco: '179,99', unidade: 'cx' },
    { nome: 'Revolution Plus 0,25mg', categoria: 'Medicamento', preco: '98,99', unidade: 'un' },
    { nome: 'Revolution Plus 0,5mg', categoria: 'Medicamento', preco: '109,99', unidade: 'un' },
    { nome: 'Revolution Plus 1mg', categoria: 'Medicamento', preco: '119,90', unidade: 'un' },
  ];

  for (const item of items) {
    await db.run(
      `INSERT INTO servicos (clinica_id, nome, categoria, quantidade, unidade, precoVenda, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [clinica_id, item.nome, item.categoria, 999, item.unidade, item.preco, item.obs || null]
    );
  }

  console.log(`✅ ${items.length} itens inseridos na Tabela de Preços!`);
  await db.close();
}

seed().catch(console.error);
