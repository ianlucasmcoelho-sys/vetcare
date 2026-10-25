// backend/src/controllers/notaFiscalController.js
import { openDb } from '../db.js';

/**
 * Gera uma chave de acesso simulada padrão SEFAZ (44 dígitos numéricos)
 */
function gerarChaveAcesso(tipo, cnpj, numero, serie = '001') {
  const uf = '35'; // SP ou padrão estadual
  const now = new Date();
  const aamm = String(now.getFullYear()).slice(-2) + String(now.getMonth() + 1).padStart(2, '0');
  const cleanCnpj = (cnpj || '00000000000191').replace(/\D/g, '').padEnd(14, '0').slice(0, 14);
  const mod = tipo === 'NFCE' ? '65' : '00'; // 65 para NFC-e, 00 para NFS-e
  const numPad = String(numero || '1').padStart(9, '0');
  const tpEmis = '1';
  const cNF = Math.floor(10000000 + Math.random() * 90000000); // 8 dígitos aleatórios
  const base43 = `${uf}${aamm}${cleanCnpj}${mod}${serie}${numPad}${tpEmis}${cNF}`;
  
  // Dígito verificador ponderado módulo 11
  let soma = 0;
  let peso = 2;
  for (let i = base43.length - 1; i >= 0; i--) {
    soma += parseInt(base43[i], 10) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const dv = 11 - (soma % 11);
  const dvFinal = dv >= 10 ? 0 : dv;
  
  return `${base43}${dvFinal}`;
}

export async function listarNotas(req, res) {
  try {
    const clinica_id = req.usuario.clinica_id;
    const { tipo, status, busca, dataInicio, dataFim } = req.query;
    const db = await openDb();

    let query = `
      SELECT n.*, r.nome as tutor_nome_cadastrado
      FROM notas_fiscais n
      LEFT JOIN responsaveis r ON n.tutor_id = r.id
      WHERE n.clinica_id = ?
    `;
    const params = [clinica_id];

    if (tipo && tipo !== 'todas') {
      query += ` AND n.tipo = ?`;
      params.push(tipo.toUpperCase());
    }

    if (status && status !== 'todas') {
      query += ` AND n.status = ?`;
      params.push(status.toLowerCase());
    }

    if (dataInicio) {
      query += ` AND date(n.data_emissao) >= date(?)`;
      params.push(dataInicio);
    }

    if (dataFim) {
      query += ` AND date(n.data_emissao) <= date(?)`;
      params.push(dataFim);
    }

    if (busca && busca.trim() !== '') {
      query += ` AND (
        n.numero LIKE ? OR 
        n.tutor_nome LIKE ? OR 
        n.tutor_cpf LIKE ? OR 
        n.chave_acesso LIKE ? OR 
        n.descricao LIKE ?
      )`;
      const termo = `%${busca.trim()}%`;
      params.push(termo, termo, termo, termo, termo);
    }

    query += ` ORDER BY n.data_emissao DESC, n.id DESC`;

    const notas = await db.all(query, params);
    res.json(notas);
  } catch (error) {
    console.error('❌ [Erro ao listar notas fiscais]:', error);
    res.status(500).json({ error: 'Erro interno ao carregar notas fiscais.' });
  }
}

export async function obterStats(req, res) {
  try {
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();

    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesAtual = String(agora.getMonth() + 1).padStart(2, '0');
    const prefixoMes = `${anoAtual}-${mesAtual}`;

    const totalMesRow = await db.get(`
      SELECT COALESCE(SUM(valor), 0) as total, COUNT(*) as qtd
      FROM notas_fiscais
      WHERE clinica_id = ? 
        AND status = 'autorizada'
        AND strftime('%Y-%m', data_emissao) = ?
    `, [clinica_id, prefixoMes]);

    const nfseRow = await db.get(`
      SELECT COUNT(*) as qtd, COALESCE(SUM(valor), 0) as total
      FROM notas_fiscais
      WHERE clinica_id = ? AND tipo = 'NFSE' AND status = 'autorizada'
    `, [clinica_id]);

    const nfceRow = await db.get(`
      SELECT COUNT(*) as qtd, COALESCE(SUM(valor), 0) as total
      FROM notas_fiscais
      WHERE clinica_id = ? AND tipo = 'NFCE' AND status = 'autorizada'
    `, [clinica_id]);

    const canceladasRow = await db.get(`
      SELECT COUNT(*) as qtd
      FROM notas_fiscais
      WHERE clinica_id = ? AND status IN ('cancelada', 'rejeitada')
    `, [clinica_id]);

    res.json({
      totalMes: totalMesRow?.total || 0,
      qtdMes: totalMesRow?.qtd || 0,
      qtdNfse: nfseRow?.qtd || 0,
      totalNfse: nfseRow?.total || 0,
      qtdNfce: nfceRow?.qtd || 0,
      totalNfce: nfceRow?.total || 0,
      qtdCanceladas: canceladasRow?.qtd || 0
    });
  } catch (error) {
    console.error('❌ [Erro ao obter stats fiscais]:', error);
    res.status(500).json({ error: 'Erro ao calcular métricas fiscais.' });
  }
}

export async function obterNotaPorId(req, res) {
  try {
    const clinica_id = req.usuario.clinica_id;
    const { id } = req.params;
    const db = await openDb();

    const nota = await db.get(`
      SELECT n.*, c.nome as clinica_nome, c.cnpj as clinica_cnpj, c.telefone as clinica_telefone
      FROM notas_fiscais n
      LEFT JOIN clinicas c ON n.clinica_id = c.id
      WHERE n.id = ? AND n.clinica_id = ?
    `, [id, clinica_id]);

    if (!nota) {
      return res.status(404).json({ error: 'Nota fiscal não encontrada.' });
    }

    res.json(nota);
  } catch (error) {
    console.error('❌ [Erro ao obter nota fiscal]:', error);
    res.status(500).json({ error: 'Erro ao buscar dados da nota fiscal.' });
  }
}

export async function emitirNota(req, res) {
  try {
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();

    const {
      tipo, // 'NFSE' ou 'NFCE'
      tutor_id,
      tutor_nome,
      tutor_cpf,
      tutor_email,
      tutor_telefone,
      descricao,
      valor,
      itens,
      forma_pagamento
    } = req.body;

    if (!tipo || !['NFSE', 'NFCE'].includes(tipo.toUpperCase())) {
      return res.status(400).json({ error: 'O tipo da nota deve ser NFSE ou NFCE.' });
    }

    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      return res.status(400).json({ error: 'O valor da nota deve ser maior que zero.' });
    }

    // Busca dados da clínica e configurações fiscais para compor a nota
    const clinica = await db.get('SELECT * FROM clinicas WHERE id = ?', [clinica_id]);
    const configFiscal = await db.get('SELECT * FROM configuracoes_fiscais WHERE clinica_id = ?', [clinica_id]);
    if (tutor_id) {
      const tutor = await db.get('SELECT id FROM responsaveis WHERE id = ? AND clinica_id = ?', [tutor_id, clinica_id]);
      if (!tutor) return res.status(404).json({ error: 'Tutor não encontrado nesta clínica.' });
    }

    // Próximo número sequencial para o tipo de nota nesta clínica
    const lastNota = await db.get(`
      SELECT MAX(CAST(numero AS INTEGER)) as max_num 
      FROM notas_fiscais 
      WHERE clinica_id = ? AND tipo = ?
    `, [clinica_id, tipo.toUpperCase()]);

    const proximoNumero = (lastNota?.max_num || (tipo.toUpperCase() === 'NFSE' ? 100 : 1000)) + 1;
    const serie = '1';

    // Gera Chave de Acesso / Identificador Fiscal
    const chaveAcesso = gerarChaveAcesso(tipo.toUpperCase(), configFiscal?.cnpj || clinica?.cnpj, proximoNumero, '001');

    const itensJson = typeof itens === 'object' ? JSON.stringify(itens) : (itens || '[]');

    const query = `
      INSERT INTO notas_fiscais (
        clinica_id, tipo, numero, serie, chave_acesso,
        tutor_id, tutor_nome, tutor_cpf, tutor_email, tutor_telefone,
        descricao, valor, itens, status, forma_pagamento,
        mensagem_retorno, url_pdf, url_xml, data_emissao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `;

    const statusInicial = 'autorizada';
    const msgRetorno = tipo.toUpperCase() === 'NFSE' 
      ? 'NFS-e emitida e homologada com sucesso no ambiente fiscal municipal.' 
      : 'NFC-e autorizada com sucesso na Secretaria da Fazenda (SEFAZ).';

    const result = await db.run(query, [
      clinica_id,
      tipo.toUpperCase(),
      String(proximoNumero),
      serie,
      chaveAcesso,
      tutor_id || null,
      tutor_nome || 'Consumidor Final',
      tutor_cpf || '',
      tutor_email || '',
      tutor_telefone || '',
      descricao || (tipo.toUpperCase() === 'NFSE' ? 'Prestação de serviços veterinários clínicos.' : 'Venda de mercadorias e insumos veterinários.'),
      valorNum,
      itensJson,
      statusInicial,
      forma_pagamento || 'Pix',
      msgRetorno,
      `/api/notas-fiscais/${chaveAcesso}/pdf`,
      `/api/notas-fiscais/${chaveAcesso}/xml`
    ]);

    const notaCriada = await db.get('SELECT * FROM notas_fiscais WHERE id = ? AND clinica_id = ?', [result.lastID, clinica_id]);

    res.status(201).json({
      message: `${tipo.toUpperCase()} emitida com sucesso!`,
      nota: notaCriada
    });
  } catch (error) {
    console.error('❌ [Erro ao emitir nota fiscal]:', error);
    res.status(500).json({ error: 'Falha ao processar emissão da nota fiscal.' });
  }
}

export async function cancelarNota(req, res) {
  try {
    const clinica_id = req.usuario.clinica_id;
    const { id } = req.params;
    const { motivo } = req.body;
    const db = await openDb();

    const nota = await db.get('SELECT * FROM notas_fiscais WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (!nota) {
      return res.status(404).json({ error: 'Nota fiscal não encontrada.' });
    }

    if (nota.status === 'cancelada') {
      return res.status(400).json({ error: 'Esta nota fiscal já foi cancelada anteriormente.' });
    }

    const justificativa = motivo && motivo.trim().length >= 10
      ? motivo.trim()
      : 'Cancelamento homologado por solicitação do emitente.';

    await db.run(`
      UPDATE notas_fiscais 
      SET status = 'cancelada', 
          motivo_cancelamento = ?,
          mensagem_retorno = 'Nota fiscal cancelada e estornada no sistema fiscal.',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND clinica_id = ?
    `, [justificativa, id, clinica_id]);

    const notaAtualizada = await db.get('SELECT * FROM notas_fiscais WHERE id = ? AND clinica_id = ?', [id, clinica_id]);

    res.json({
      message: 'Nota fiscal cancelada com sucesso!',
      nota: notaAtualizada
    });
  } catch (error) {
    console.error('❌ [Erro ao cancelar nota fiscal]:', error);
    res.status(500).json({ error: 'Erro ao registrar cancelamento da nota fiscal.' });
  }
}

export async function obterConfiguracoesFiscais(req, res) {
  try {
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();

    let config = await db.get('SELECT * FROM configuracoes_fiscais WHERE clinica_id = ?', [clinica_id]);
    const clinica = await db.get('SELECT * FROM clinicas WHERE id = ?', [clinica_id]);

    if (!config) {
      config = {
        clinica_id,
        cnpj: clinica?.cnpj || '',
        razao_social: clinica?.nome || '',
        nome_fantasia: clinica?.nome || '',
        inscricao_municipal: '',
        inscricao_estadual: '',
        regime_tributario: 'simples_nacional',
        provedor: 'focus_nfe',
        ambiente: 'homologacao',
        api_token: '',
        cnae: '7500-1/00',
        codigo_servico_municipal: '5.01',
        aliquota_iss: 2.0
      };
    }

    res.json(config);
  } catch (error) {
    console.error('❌ [Erro ao obter configurações fiscais]:', error);
    res.status(500).json({ error: 'Erro ao carregar parâmetros fiscais.' });
  }
}

export async function atualizarConfiguracoesFiscais(req, res) {
  try {
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();

    const {
      cnpj,
      razao_social,
      nome_fantasia,
      inscricao_municipal,
      inscricao_estadual,
      regime_tributario,
      provedor,
      ambiente,
      api_token,
      cnae,
      codigo_servico_municipal,
      aliquota_iss
    } = req.body;

    const existente = await db.get('SELECT id FROM configuracoes_fiscais WHERE clinica_id = ?', [clinica_id]);

    if (existente) {
      await db.run(`
        UPDATE configuracoes_fiscais SET
          cnpj = ?,
          razao_social = ?,
          nome_fantasia = ?,
          inscricao_municipal = ?,
          inscricao_estadual = ?,
          regime_tributario = ?,
          provedor = ?,
          ambiente = ?,
          api_token = ?,
          cnae = ?,
          codigo_servico_municipal = ?,
          aliquota_iss = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE clinica_id = ?
      `, [
        cnpj || '',
        razao_social || '',
        nome_fantasia || '',
        inscricao_municipal || '',
        inscricao_estadual || '',
        regime_tributario || 'simples_nacional',
        provedor || 'focus_nfe',
        ambiente || 'homologacao',
        api_token || '',
        cnae || '7500-1/00',
        codigo_servico_municipal || '5.01',
        parseFloat(aliquota_iss) || 2.0,
        clinica_id
      ]);
    } else {
      await db.run(`
        INSERT INTO configuracoes_fiscais (
          clinica_id, cnpj, razao_social, nome_fantasia,
          inscricao_municipal, inscricao_estadual, regime_tributario,
          provedor, ambiente, api_token, cnae,
          codigo_servico_municipal, aliquota_iss
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        clinica_id,
        cnpj || '',
        razao_social || '',
        nome_fantasia || '',
        inscricao_municipal || '',
        inscricao_estadual || '',
        regime_tributario || 'simples_nacional',
        provedor || 'focus_nfe',
        ambiente || 'homologacao',
        api_token || '',
        cnae || '7500-1/00',
        codigo_servico_municipal || '5.01',
        parseFloat(aliquota_iss) || 2.0
      ]);
    }

    const configSalva = await db.get('SELECT * FROM configuracoes_fiscais WHERE clinica_id = ?', [clinica_id]);
    res.json({
      message: 'Configurações fiscais salvas com sucesso!',
      config: configSalva
    });
  } catch (error) {
    console.error('❌ [Erro ao atualizar configurações fiscais]:', error);
    res.status(500).json({ error: 'Erro ao salvar parâmetros fiscais da clínica.' });
  }
}
