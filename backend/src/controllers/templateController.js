// backend/src/controllers/templateController.js
import { openDb } from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, '../templates');

// Garantir pasta de templates
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

// Listar templates
export const listarTemplates = async (req, res) => {
  try {
    const db = await openDb();
    const templates = await db.all(`
      SELECT id, nome, tipo, ativo, created_at 
      FROM templates 
      WHERE clinica_id = ?
      ORDER BY ativo DESC, created_at DESC
    `, [req.usuario.clinica_id]);
    
    res.json(templates);
  } catch (error) {
    console.error('Erro ao listar templates:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// Buscar template ativo por tipo
export const getTemplateAtivo = async (req, res) => {
  try {
    const { tipo } = req.params;
    const db = await openDb();
    
    let template = await db.get(`
      SELECT * FROM templates 
      WHERE clinica_id = ? AND tipo = ? AND ativo = 1
    `, [req.usuario.clinica_id, tipo]);
    
    // Template padrão se não existir personalizado
    if (!template) {
      template = {
        id: 0,
        nome: 'Template Padrão',
        tipo,
        conteudo_html: getDefaultTemplate(tipo),
        conteudo_css: getDefaultCSS(),
        ativo: 1
      };
    }
    
    res.json(template);
  } catch (error) {
    console.error('Erro ao buscar template:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// Criar template
export const criarTemplate = async (req, res) => {
  try {
    const { nome, tipo, conteudo_html, conteudo_css } = req.body;
    if (typeof nome !== 'string' || !nome.trim() || !['receituario', 'prontuario'].includes(tipo) || typeof conteudo_html !== 'string' || !conteudo_html.trim()) {
      return res.status(400).json({ error: 'Informe nome, tipo e conteúdo HTML do modelo.' });
    }
    const db = await openDb();
    
    const result = await db.run(`
      INSERT INTO templates (clinica_id, nome, tipo, conteudo_html, conteudo_css)
      VALUES (?, ?, ?, ?, ?)
    `, [req.usuario.clinica_id, nome, tipo, conteudo_html, conteudo_css || '']);
    
    res.status(201).json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Erro ao criar template:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// Atualizar template
export const atualizarTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, conteudo_html, conteudo_css, ativo } = req.body;
    const db = await openDb();
    const existing = await db.get('SELECT tipo FROM templates WHERE id = ? AND clinica_id = ?', [id, req.usuario.clinica_id]);
    if (!existing) return res.status(404).json({ error: 'Modelo não encontrado.' });
    
    await db.run(`
      UPDATE templates SET 
        nome = COALESCE(?, nome),
        conteudo_html = COALESCE(?, conteudo_html),
        conteudo_css = COALESCE(?, conteudo_css),
        ativo = COALESCE(?, ativo),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND clinica_id = ?
    `, [nome, conteudo_html, conteudo_css, ativo, id, req.usuario.clinica_id]);
    
    // Se este template foi ativado, desativar os outros do mesmo tipo
    if (ativo === 1) {
      await db.run(`
        UPDATE templates SET ativo = 0 
        WHERE clinica_id = ? AND tipo = ? AND id != ?
      `, [req.usuario.clinica_id, existing.tipo, id]);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar template:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// Deletar template
export const deletarTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await openDb();
    await db.run('DELETE FROM templates WHERE id = ? AND clinica_id = ?', [id, req.usuario.clinica_id]);
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar template:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// Upload de arquivo HTML (template)
export const uploadTemplate = async (req, res) => {
  try {
    const { tipo, nome } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    if (typeof nome !== 'string' || !nome.trim() || !['receituario', 'prontuario'].includes(tipo)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Informe nome e tipo válidos para o modelo.' });
    }
    
    const conteudo_html = fs.readFileSync(file.path, 'utf8');
    
    // Salvar no banco
    const db = await openDb();
    const result = await db.run(`
      INSERT INTO templates (clinica_id, nome, tipo, conteudo_html, ativo)
      VALUES (?, ?, ?, ?, 0)
    `, [req.usuario.clinica_id, nome, tipo, conteudo_html]);
    
    // Limpar arquivo temporário
    fs.unlinkSync(file.path);
    
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Erro ao fazer upload' });
  }
};

// Função para substituir placeholders
export const renderizarTemplate = (templateHtml, dados) => {
  let html = templateHtml;
  
  const placeholders = {
    '{{pet_nome}}': dados.pet_nome || '',
    '{{pet_especie}}': dados.pet_especie || '',
    '{{pet_raca}}': dados.pet_raca || '',
    '{{pet_sexo}}': dados.pet_sexo || '',
    '{{pet_nascimento}}': dados.pet_nascimento || '',
    '{{pet_idade}}': dados.pet_idade || '',
    '{{tutor_nome}}': dados.tutor_nome || '',
    '{{tutor_celular}}': dados.tutor_celular || '',
    '{{tutor_email}}': dados.tutor_email || '',
    '{{data_emissao}}': dados.data_emissao || '',
    '{{data_visita}}': dados.data_visita || '',
    '{{medicamentos}}': dados.medicamentos || '',
    '{{posologia}}': dados.posologia || '',
    '{{observacoes}}': dados.observacoes || '',
    '{{diagnostico}}': dados.diagnostico || '',
    '{{tratamento}}': dados.tratamento || '',
    '{{veterinario}}': dados.veterinario || '',
    '{{crmv}}': dados.crmv || '',
    '{{clinica_nome}}': dados.clinica_nome || '',
    '{{clinica_endereco}}': dados.clinica_endereco || '',
    '{{clinica_telefone}}': dados.clinica_telefone || '',
    '{{clinica_email}}': dados.clinica_email || '',
    '{{data_atual}}': new Date().toLocaleDateString('pt-BR'),
    '{{hora_atual}}': new Date().toLocaleTimeString('pt-BR')
  };
  
  for (const [placeholder, value] of Object.entries(placeholders)) {
    html = html.split(placeholder).join(value);
  }
  
  return html;
};

// Template padrão
function getDefaultTemplate(tipo) {
  if (tipo === 'receituario') {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receituário Médico</title>
  <style>{{css}}</style>
</head>
<body>
  <div class="receita">
    <div class="header">
      <h1>{{clinica_nome}}</h1>
      <p>{{clinica_endereco}} | {{clinica_telefone}} | {{clinica_email}}</p>
    </div>
    <h2>RECEITUÁRIO MÉDICO</h2>
    <div class="paciente">
      <p><strong>Paciente:</strong> {{pet_nome}} | <strong>Espécie:</strong> {{pet_especie}} | <strong>Raça:</strong> {{pet_raca}}</p>
      <p><strong>Tutor:</strong> {{tutor_nome}} | <strong>Data:</strong> {{data_emissao}}</p>
    </div>
    <div class="medicamentos">
      <h3>Medicamentos Prescritos</h3>
      <p>{{medicamentos}}</p>
    </div>
    <div class="posologia">
      <h3>Posologia</h3>
      <p>{{posologia}}</p>
    </div>
    <div class="observacoes">
      <h3>Observações</h3>
      <p>{{observacoes}}</p>
    </div>
    <div class="assinatura">
      <p>_________________________________</p>
      <p>{{veterinario}} - CRMV {{crmv}}</p>
    </div>
  </div>
</body>
</html>`;
  }
  return '';
}

function getDefaultCSS() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 40px; }
    .receita { max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #14b8a6; }
    .header h1 { color: #14b8a6; margin-bottom: 10px; }
    h2 { text-align: center; margin-bottom: 20px; color: #1e2c3a; }
    .paciente { background: #f5f7fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    h3 { margin: 15px 0 10px 0; color: #14b8a6; }
    .assinatura { margin-top: 40px; text-align: center; }
    .assinatura p { margin: 5px 0; }
  `;
}
