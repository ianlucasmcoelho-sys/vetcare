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
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Arquivo e ID do animal são obrigatórios' });
    }

    const header = fs.readFileSync(file.path).subarray(0, 12);
    const signatures = {
      'application/pdf': header.subarray(0, 5).toString() === '%PDF-',
      'image/jpeg': header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff,
      'image/png': header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      'image/webp': header.subarray(0, 4).toString() === 'RIFF' && header.subarray(8, 12).toString() === 'WEBP'
    };
    if (!signatures[file.mimetype]) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'O conteúdo do arquivo não corresponde ao tipo permitido.' });
    }

    const db = await openDb();
    const animal = await db.get('SELECT id FROM animais WHERE id = ? AND clinica_id = ?', [animal_id, clinica_id]);
    if (!animal) {
      fs.unlinkSync(file.path);
      return res.status(404).json({ error: 'Animal não encontrado nesta clínica' });
    }

    const result = await db.run(
      `INSERT INTO anexos (clinica_id, animal_id, nome_arquivo, caminho, tipo_mime, tamanho, categoria)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [clinica_id, animal_id, file.originalname, file.path, file.mimetype, file.size, categoria || 'Exame']
    );

    res.status(201).json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Erro no upload:', error);
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
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
    res.attachment(anexo.nome_arquivo);
    
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
    await db.run('DELETE FROM anexos WHERE id = ? AND clinica_id = ?', [id, clinica_id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar arquivo' });
  }
};
