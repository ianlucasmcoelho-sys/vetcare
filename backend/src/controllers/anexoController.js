import { openDb } from '../db.js';
import fs from 'fs';
import path from 'path';

// Listar anexos de um animal
export const getAnexosByAnimal = async (req, res) => {
  try {
    const { animalId } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();
    
    const anexos = await db.all(
      'SELECT * FROM anexos WHERE animal_id = ? AND clinica_id = ? ORDER BY created_at DESC',
      [animalId, clinica_id]
    );
    res.json(anexos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar arquivos' });
  }
};

// Upload de novo anexo
export const uploadAnexo = async (req, res) => {
  try {
    const { animal_id, categoria } = req.body;
    const clinica_id = req.usuario.clinica_id;
    const file = req.file;

    if (!file || !animal_id) {
      return res.status(400).json({ error: 'Arquivo e ID do animal são obrigatórios' });
    }

    const db = await openDb();
    const result = await db.run(
      `INSERT INTO anexos (clinica_id, animal_id, nome_arquivo, caminho, tipo_mime, tamanho, categoria)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [clinica_id, animal_id, file.originalname, file.path, file.mimetype, file.size, categoria || 'Exame']
    );

    res.status(201).json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro ao processar upload' });
  }
};

// Download de anexo com headers corretos
export const downloadAnexo = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();

    const anexo = await db.get('SELECT * FROM anexos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    
    if (!anexo) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    const filePath = path.resolve(anexo.caminho);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo físico não encontrado' });
    }

    // Definir headers para o browser entender como download
    res.setHeader('Content-Type', anexo.tipo_mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${anexo.nome_arquivo}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Erro no download:', error);
    res.status(500).json({ error: 'Erro ao processar download' });
  }
};

// Deletar anexo
export const deleteAnexo = async (req, res) => {
  try {
    const { id } = req.params;
    const clinica_id = req.usuario.clinica_id;
    const db = await openDb();

    const anexo = await db.get('SELECT * FROM anexos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    if (!anexo) return res.status(404).json({ error: 'Arquivo não encontrado' });

    // Remover do disco
    if (fs.existsSync(anexo.caminho)) {
      fs.unlinkSync(anexo.caminho);
    }

    // Remover do banco
    await db.run('DELETE FROM anexos WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar arquivo' });
  }
};
