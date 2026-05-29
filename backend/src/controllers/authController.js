import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { openDb } from '../db.js';

const JWT_SECRET = 'vetcare_secret_key_2024';

export const login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    const db = await openDb();
    
    const usuario = await db.get(`
      SELECT u.*, c.nome as clinica_nome
      FROM usuarios u
      LEFT JOIN clinicas c ON u.clinica_id = c.id
      WHERE u.email = ? AND u.ativo = 1
    `, [email]);

    if (!usuario) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      const novasTentativas = (usuario.tentativas_login || 0) + 1;
      await db.run(`UPDATE usuarios SET tentativas_login = ? WHERE id = ?`, [novasTentativas, usuario.id]);
      return res.status(401).json({ error: 'E-mail ou senha inválidos' });
    }

    await db.run(`UPDATE usuarios SET tentativas_login = 0, ultimo_login = CURRENT_TIMESTAMP WHERE id = ?`, [usuario.id]);

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, nome: usuario.nome, perfil: usuario.perfil, clinica_id: usuario.clinica_id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil
      },
      clinica: { id: usuario.clinica_id, nome: usuario.clinica_nome }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const verificarToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, usuario: decoded });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

export const criarUsuario = async (req, res) => {
  try {
    const { nome, email, senha, perfil } = req.body;
    const db = await openDb();
    
    const existe = await db.get('SELECT id FROM usuarios WHERE email = ? AND clinica_id = ?', [email, req.usuario.clinica_id]);
    if (existe) {
      return res.status(400).json({ error: 'E-mail já cadastrado nesta clínica' });
    }

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    }

    const perfisValidos = ['admin', 'veterinario', 'recepcionista'];
    const perfilFinal = perfisValidos.includes(perfil) ? perfil : 'recepcionista';
    
    const senhaHash = await bcrypt.hash(senha, 10);
    const result = await db.run(
      `INSERT INTO usuarios (clinica_id, nome, email, senha, perfil, ativo) 
       VALUES (?, ?, ?, ?, ?, 1)`,
      [req.usuario.clinica_id, nome, email, senhaHash, perfilFinal]
    );

    res.status(201).json({ success: true, id: result.lastID, message: `Usuário ${perfilFinal} criado com sucesso!` });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const listarUsuarios = async (req, res) => {
  try {
    const db = await openDb();
    const usuarios = await db.all(`
      SELECT id, nome, email, perfil, ativo, created_at, ultimo_login 
      FROM usuarios 
      WHERE clinica_id = ?
      ORDER BY 
        CASE perfil 
          WHEN 'admin' THEN 1 
          WHEN 'veterinario' THEN 2 
          ELSE 3 
        END,
        nome ASC
    `, [req.usuario.clinica_id]);
    
    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const atualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, perfil, ativo } = req.body;
    
    if (req.usuario.perfil !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem editar usuários' });
    }
    
    const db = await openDb();
    
    if (parseInt(id) === req.usuario.id && perfil !== 'admin') {
      return res.status(403).json({ error: 'Você não pode rebaixar seu próprio perfil' });
    }
    
    await db.run(
      `UPDATE usuarios SET nome = ?, email = ?, perfil = ?, ativo = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND clinica_id = ?`,
      [nome, email, perfil, ativo, id, req.usuario.clinica_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const deletarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.usuario.perfil !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem excluir usuários' });
    }
    
    if (parseInt(id) === req.usuario.id) {
      return res.status(403).json({ error: 'Você não pode excluir sua própria conta' });
    }
    
    const db = await openDb();
    await db.run('DELETE FROM usuarios WHERE id = ? AND clinica_id = ?', [id, req.usuario.clinica_id]);
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const alterarSenha = async (req, res) => {
  try {
    const { id } = req.params;
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
    }

    const db = await openDb();
    const usuario = await db.get('SELECT * FROM usuarios WHERE id = ? AND clinica_id = ?', [id, req.usuario.clinica_id]);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    const novaSenhaHash = await bcrypt.hash(novaSenha, 10);
    await db.run('UPDATE usuarios SET senha = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [novaSenhaHash, id]);

    res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const cadastroClinica = async (req, res) => {
  try {
    const { clinica_nome, clinica_cnpj, clinica_telefone, clinica_email, admin_nome, admin_email, admin_senha } = req.body;
    const db = await openDb();

    const adminExistente = await db.get('SELECT id FROM usuarios WHERE email = ?', [admin_email]);
    if (adminExistente) {
      return res.status(400).json({ error: 'E-mail do administrador já cadastrado' });
    }

    const clinicaResult = await db.run(
      `INSERT INTO clinicas (nome, cnpj, telefone, email) VALUES (?, ?, ?, ?)`,
      [clinica_nome, clinica_cnpj, clinica_telefone, clinica_email]
    );
    const clinicaId = clinicaResult.lastID;

    const senhaHash = await bcrypt.hash(admin_senha, 10);
    await db.run(
      `INSERT INTO usuarios (clinica_id, nome, email, senha, perfil) VALUES (?, ?, ?, ?, 'admin')`,
      [clinicaId, admin_nome, admin_email, senhaHash]
    );

    res.status(201).json({ success: true, message: 'Clínica cadastrada com sucesso!' });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const recuperarSenha = async (req, res) => {
  try {
    const { email } = req.body;
    const db = await openDb();
    
    const usuario = await db.get('SELECT id, nome, email FROM usuarios WHERE email = ?', [email]);
    if (!usuario) {
      return res.status(404).json({ error: 'E-mail não encontrado' });
    }

    const token = jwt.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET, { expiresIn: '1h' });
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/resetar-senha?token=${token}`;

    console.log('Link de recuperação:', resetLink);
    res.json({ success: true, message: 'E-mail de recuperação enviado' });
  } catch (error) {
    console.error('Erro na recuperação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const resetarSenha = async (req, res) => {
  try {
    const { token, novaSenha } = req.body;
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const db = await openDb();
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await db.run('UPDATE usuarios SET senha = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [senhaHash, decoded.id]);

    res.json({ success: true, message: 'Senha alterada com sucesso!' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ error: 'Token inválido ou expirado' });
  }
};

export const logout = async (req, res) => {
  try {
    res.json({ success: true });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};