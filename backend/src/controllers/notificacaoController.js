// backend/src/controllers/notificacaoController.js
import { openDb } from '../db.js';

export const getNotificacoes = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const dataHoje = `${ano}-${mes}-${dia}`;
    
    const notificacoes = [];

    // 1. Consultas de hoje
    const consultasHoje = await db.all(`
      SELECT a.*, an.nome as animal_nome 
      FROM agendamentos a
      LEFT JOIN animais an ON a.animal_id = an.id
      WHERE a.data = ? AND a.status != 'Concluído' AND a.clinica_id = ?
    `, [dataHoje, clinica_id]);
    
    for (const consulta of consultasHoje) {
      notificacoes.push({
        id: `consulta_${consulta.id}`,
        tipo: "consulta",
        titulo: "Consulta Hoje",
        mensagem: `${consulta.animal_nome || "Pet"} às ${consulta.horario}`,
        data: consulta.data,
        prioridade: "alta",
        lida: false
      });
    }

    // 2. Vacinas vencidas
    const vacinasVencidas = await db.all(`
      SELECT v.*, a.nome as pet_nome 
      FROM vacinas v
      LEFT JOIN animais a ON v.animal_id = a.id
      WHERE v.proxima_dose < ? AND v.clinica_id = ?
    `, [dataHoje, clinica_id]);
    
    for (const vacina of vacinasVencidas) {
      notificacoes.push({
        id: `vacina_vencida_${vacina.id}`,
        tipo: "vacina",
        titulo: "Vacina Vencida",
        mensagem: `${vacina.pet_nome || "Pet"} - ${vacina.nome_vacina}`,
        data: vacina.proxima_dose,
        prioridade: "alta",
        lida: false
      });
    }

    // 3. Estoque baixo
    const itensBaixo = await db.all(`
      SELECT * FROM servicos WHERE quantidade <= 5 AND clinica_id = ?
    `, [clinica_id]);
    
    for (const item of itensBaixo) {
      notificacoes.push({
        id: `estoque_${item.id}`,
        tipo: "estoque",
        titulo: "Estoque Baixo",
        mensagem: `${item.nome} - apenas ${item.quantidade} ${item.unidade}`,
        data: dataHoje,
        prioridade: "media",
        lida: false
      });
    }

    res.json(notificacoes);
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getNotificacoesNaoLidas = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;
    
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const dataHoje = `${ano}-${mes}-${dia}`;
    
    let total = 0;

    // Consultas de hoje
    const consultas = await db.get(`
      SELECT COUNT(*) as total FROM agendamentos 
      WHERE data = ? AND status != 'Concluído' AND clinica_id = ?
    `, [dataHoje, clinica_id]);
    total += (consultas?.total || 0);

    // Vacinas vencidas
    const vacinas = await db.get(`
      SELECT COUNT(*) as total FROM vacinas 
      WHERE proxima_dose < ? AND clinica_id = ?
    `, [dataHoje, clinica_id]);
    total += (vacinas?.total || 0);

    // Estoque baixo
    const estoque = await db.get(`
      SELECT COUNT(*) as total FROM servicos 
      WHERE quantidade <= 5 AND clinica_id = ?
    `, [clinica_id]);
    total += (estoque?.total || 0);

    console.log(`🔔 Total de notificações não lidas para clínica ${clinica_id}: ${total}`);
    res.json({ total });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: error.message });
  }
};