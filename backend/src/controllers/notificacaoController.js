// backend/src/controllers/notificacaoController.js
import { openDb } from '../db.js';

export const getNotificacoes = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    
    const hoje = new Date();
    const dataHoje = hoje.toISOString().split('T')[0];
    
    const umaSemanaDepois = new Date();
    umaSemanaDepois.setDate(hoje.getDate() + 7);
    const dataUmaSemana = umaSemanaDepois.toISOString().split('T')[0];
    
    const notificacoes = [];

    // 1. Consultas de hoje (Agendamentos)
    const consultasHoje = await db.all(`
      SELECT a.*, an.nome as animal_nome 
      FROM agendamentos a
      LEFT JOIN animais an ON a.animal_id = an.id
      WHERE a.data = ? AND a.status NOT IN ('Concluído', 'Cancelado') AND a.clinica_id = ?
    `, [dataHoje, clinica_id]);
    
    for (const consulta of consultasHoje) {
      notificacoes.push({
        id: `consulta_${consulta.id}_${dataHoje}`,
        tipo: "consulta",
        titulo: "Consulta Hoje",
        mensagem: `${consulta.animal_nome || "Pet"} às ${consulta.horario}`,
        data: consulta.data,
        prioridade: "alta",
        lida: false
      });
    }

    // 2. Retornos de hoje
    const retornosHoje = await db.all(`
      SELECT r.*, a.nome as animal_nome 
      FROM retornos r
      LEFT JOIN animais a ON r.animal_id = a.id
      WHERE r.data_retorno = ? AND r.status != 'Concluído' AND r.clinica_id = ?
    `, [dataHoje, clinica_id]);

    for (const retorno of retornosHoje) {
      notificacoes.push({
        id: `retorno_${retorno.id}_${dataHoje}`,
        tipo: "retorno",
        titulo: "Retorno Hoje",
        mensagem: `${retorno.animal_nome || "Pet"} às ${retorno.horario}`,
        data: retorno.data_retorno,
        prioridade: "media",
        lida: false
      });
    }

    // 3. Vacinas (Próximos 7 dias e atrasadas)
    const vacinasAlertas = await db.all(`
      SELECT v.*, a.nome as pet_nome 
      FROM vacinas v
      LEFT JOIN animais a ON v.animal_id = a.id
      WHERE v.proxima_dose <= ? AND v.clinica_id = ?
      ORDER BY v.proxima_dose ASC
    `, [dataUmaSemana, clinica_id]);
    
    for (const vacina of vacinasAlertas) {
      const isAtrasada = vacina.proxima_dose < dataHoje;
      notificacoes.push({
        id: `vacina_${vacina.id}_${vacina.proxima_dose}`,
        tipo: isAtrasada ? "vacina_vencida" : "vacina",
        titulo: isAtrasada ? "Vacina Vencida" : "Vacina Próxima",
        mensagem: `${vacina.pet_nome || "Pet"} - ${vacina.nome_vacina} (${isAtrasada ? 'Atrasada' : 'Em breve'})`,
        data: vacina.proxima_dose,
        prioridade: isAtrasada ? "alta" : "media",
        lida: false
      });
    }

    // 4. Estoque baixo
    const itensBaixo = await db.all(`
      SELECT * FROM servicos 
      WHERE quantidade <= estoqueMinimo AND clinica_id = ?
    `, [clinica_id]);
    
    for (const item of itensBaixo) {
      notificacoes.push({
        id: `estoque_${item.id}`,
        tipo: "estoque",
        titulo: "Estoque Baixo",
        mensagem: `${item.nome} - apenas ${item.quantidade} ${item.unidade || 'un'}`,
        data: dataHoje,
        prioridade: "media",
        lida: false
      });
    }

    res.json(notificacoes);
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getNotificacoesNaoLidas = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    
    const hoje = new Date();
    const dataHoje = hoje.toISOString().split('T')[0];
    
    const umaSemanaDepois = new Date();
    umaSemanaDepois.setDate(hoje.getDate() + 7);
    const dataUmaSemana = umaSemanaDepois.toISOString().split('T')[0];
    
    let total = 0;

    // Consultas de hoje
    const consultas = await db.get(`
      SELECT COUNT(*) as total FROM agendamentos 
      WHERE data = ? AND status NOT IN ('Concluído', 'Cancelado') AND clinica_id = ?
    `, [dataHoje, clinica_id]);
    total += (consultas?.total || 0);

    // Retornos de hoje
    const retornos = await db.get(`
      SELECT COUNT(*) as total FROM retornos 
      WHERE data_retorno = ? AND status != 'Concluído' AND clinica_id = ?
    `, [dataHoje, clinica_id]);
    total += (retornos?.total || 0);

    // Vacinas
    const vacinas = await db.get(`
      SELECT COUNT(*) as total FROM vacinas 
      WHERE proxima_dose <= ? AND clinica_id = ?
    `, [dataUmaSemana, clinica_id]);
    total += (vacinas?.total || 0);

    // Estoque baixo
    const estoque = await db.get(`
      SELECT COUNT(*) as total FROM servicos 
      WHERE quantidade <= estoqueMinimo AND clinica_id = ?
    `, [clinica_id]);
    total += (estoque?.total || 0);

    res.json({ total });
  } catch (error) {
    console.error('Erro ao contar notificações não lidas:', error);
    res.status(500).json({ error: error.message });
  }
};