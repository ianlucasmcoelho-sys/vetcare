import { isRetiredDemoAccount } from '../services/demoAccess.js';
import { currentSessionUser } from '../services/sessionUser.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { openDb, runTransaction } from '../db.js';
import { OAuth2Client } from 'google-auth-library';
import { enviarEmailRecuperacao } from '../services/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'vetcare_secret_key_2024';
const googleClient = new OAuth2Client('1057629123787-gskt2kvcok51e44dqtin4jkd93ks311q.apps.googleusercontent.com');

export const login = async (req, res) => {
  try {
    const { senha } = req.body;
    const email = req.body.email.trim().toLowerCase();
    const db = await openDb();
    
    const usuario = await db.get(`
      SELECT u.*, c.nome as clinica_nome, c.email as clinica_email, c.status_assinatura, c.data_expiracao, c.plano_id, c.onboarding_concluido
      FROM usuarios u
      LEFT JOIN clinicas c ON u.clinica_id = c.id
      WHERE LOWER(u.email) = ? AND u.ativo = 1
    `, [email]);

    if (!usuario || isRetiredDemoAccount(usuario)) {
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
      clinica: { 
        id: usuario.clinica_id, 
        nome: usuario.clinica_nome,
        status_assinatura: usuario.status_assinatura,
        data_expiracao: usuario.data_expiracao,
        plano_id: usuario.plano_id,
        onboarding_concluido: usuario.onboarding_concluido
      }
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
    const db = await openDb();
    const user = await currentSessionUser(db, decoded);
    if (!user) return res.status(401).json({ error: 'Sessão revogada. Faça login novamente.' });
    const clinica = await db.get('SELECT email as clinica_email FROM clinicas WHERE id = ?', [decoded.clinica_id]);
    if (!clinica || isRetiredDemoAccount({ email: user.email, clinica_email: clinica?.clinica_email })) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    res.json({ valid: true, usuario: user });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token do Google é obrigatório' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: '1057629123787-gskt2kvcok51e44dqtin4jkd93ks311q.apps.googleusercontent.com',
    });
    
    const payload = ticket.getPayload();
    const email = payload.email;
    const nome = payload.name || 'Usuário Google';

    const db = await openDb();
    
    // Procura o usuário
    let usuario = await db.get(`
      SELECT u.*, c.nome as clinica_nome, c.email as clinica_email, c.status_assinatura, c.data_expiracao, c.plano_id, c.onboarding_concluido
      FROM usuarios u
      LEFT JOIN clinicas c ON u.clinica_id = c.id
      WHERE u.email = ? AND u.ativo = 1
    `, [email]);

    if (!usuario) {
      // Se não existe, cria a clínica primeiro
      const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const resultClinica = await db.run(
        `INSERT INTO clinicas (nome, plano_id, status_assinatura, data_expiracao, data_criacao) VALUES (?, 'free', 'trial', ?, CURRENT_TIMESTAMP)`,
        [`Clínica de ${nome}`, trialExpiresAt]
      );
      const clinicaId = resultClinica.lastID;

      // Gera senha aleatória pra preencher o NOT NULL
      const senhaHash = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
      
      const resultUsuario = await db.run(
        `INSERT INTO usuarios (clinica_id, nome, email, senha, perfil, ativo) VALUES (?, ?, ?, ?, 'admin', 1)`,
        [clinicaId, nome, email, senhaHash]
      );
      
      usuario = await db.get(`
        SELECT u.*, c.nome as clinica_nome, c.email as clinica_email, c.status_assinatura, c.data_expiracao, c.plano_id, c.onboarding_concluido
        FROM usuarios u
        LEFT JOIN clinicas c ON u.clinica_id = c.id
        WHERE u.id = ?
      `, [resultUsuario.lastID]);
    }

    if (isRetiredDemoAccount(usuario)) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos' });
    }

    await db.run(`UPDATE usuarios SET tentativas_login = 0, ultimo_login = CURRENT_TIMESTAMP WHERE id = ?`, [usuario.id]);

    const jwtToken = jwt.sign(
      { id: usuario.id, email: usuario.email, nome: usuario.nome, perfil: usuario.perfil, clinica_id: usuario.clinica_id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token: jwtToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil
      },
      clinica: { 
        id: usuario.clinica_id, 
        nome: usuario.clinica_nome,
        status_assinatura: usuario.status_assinatura,
        data_expiracao: usuario.data_expiracao,
        plano_id: usuario.plano_id,
        onboarding_concluido: usuario.onboarding_concluido
      }
    });

  } catch (error) {
    console.error('Erro no login com Google:', error);
    res.status(401).json({ error: 'Falha na autenticação com o Google' });
  }
};

export const criarUsuario = async (req, res) => {
  try {
    const { senha, perfil } = req.body;
    const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const db = await openDb();
    
    const existe = await db.get('SELECT id FROM usuarios WHERE LOWER(email) = ?', [email]);
    if (existe) {
      return res.status(400).json({ error: 'Este e-mail já possui uma conta.' });
    }

    if (!nome || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof senha !== 'string') {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/.test(senha)) {
      return res.status(400).json({ error: 'Use ao menos 8 caracteres, com maiúscula, minúscula, número e símbolo.' });
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
    
    const existing = await db.get('SELECT * FROM usuarios WHERE id = ? AND clinica_id = ?', [id, req.usuario.clinica_id]);
    if (!existing) return res.status(404).json({ error: 'Usuário não encontrado.' });
    const finalRole = perfil ?? existing.perfil;
    const finalActive = ativo ?? existing.ativo;
    if (!['admin', 'veterinario', 'recepcionista'].includes(finalRole) || ![0, 1, false, true].includes(finalActive)) {
      return res.status(400).json({ error: 'Perfil ou situação do usuário inválidos.' });
    }
    if (typeof nome !== 'string' || !nome.trim() || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Informe nome e e-mail válidos.' });
    }
    if (Number(id) === Number(req.usuario.id) && (finalRole !== 'admin' || !finalActive)) {
      return res.status(403).json({ error: 'Você não pode desativar ou rebaixar seu próprio acesso.' });
    }
    const duplicate = await db.get('SELECT id FROM usuarios WHERE LOWER(email) = ? AND id <> ?', [email.trim().toLowerCase(), id]);
    if (duplicate) return res.status(400).json({ error: 'Este e-mail já possui uma conta.' });
    
    await db.run(
      `UPDATE usuarios SET nome = ?, email = ?, perfil = ?, ativo = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND clinica_id = ?`,
      [nome.trim(), email.trim().toLowerCase(), finalRole, Number(finalActive), id, req.usuario.clinica_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const atualizarMeuPerfil = async (req, res) => {
  try {
    const { nome } = req.body;
    
    if (!nome || nome.trim().length === 0) {
      return res.status(400).json({ error: 'O nome é obrigatório' });
    }
    
    const db = await openDb();
    
    await db.run(
      `UPDATE usuarios SET nome = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND clinica_id = ?`,
      [nome.trim(), req.usuario.id, req.usuario.clinica_id]
    );

    res.json({ success: true, nome: nome.trim() });
  } catch (error) {
    console.error('Erro ao atualizar meu perfil:', error);
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

    if (Number(id) !== Number(req.usuario.id) && req.usuario.perfil !== 'admin') {
      return res.status(403).json({ error: 'Você só pode alterar sua senha.' });
    }

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/;
    if (!passwordRegex.test(novaSenha)) {
      return res.status(400).json({ error: 'Senha fraca. Deve ter no mínimo 8 caracteres, maiúscula, minúscula, número e símbolo.' });
    }

    const db = await openDb();
    const usuario = await db.get('SELECT * FROM usuarios WHERE id = ? AND clinica_id = ?', [id, req.usuario.clinica_id]);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaValida) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    const novaSenhaHash = await bcrypt.hash(novaSenha, 10);
    await db.run('UPDATE usuarios SET senha = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND clinica_id = ?', [novaSenhaHash, id, req.usuario.clinica_id]);

    res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const cadastroClinica = async (req, res) => {
  try {
    const { clinica_cnpj, clinica_telefone, admin_senha } = req.body;
    const normalize = value => typeof value === 'string' ? value.trim() : '';
    const clinica_nome = normalize(req.body.clinica_nome);
    const admin_nome = normalize(req.body.admin_nome);
    const admin_email = normalize(req.body.admin_email).toLowerCase();
    const clinica_email = normalize(req.body.clinica_email).toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!clinica_nome || !admin_nome || !emailPattern.test(admin_email) || (clinica_email && !emailPattern.test(clinica_email))) {
      return res.status(400).json({ error: 'Informe o nome da clínica, o nome do administrador e e-mails válidos.' });
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/;
    if (typeof admin_senha !== 'string' || !passwordRegex.test(admin_senha)) {
      return res.status(400).json({ error: 'Senha fraca. Deve ter no mínimo 8 caracteres, maiúscula, minúscula, número e símbolo.' });
    }

    const db = await openDb();

    const adminExistente = await db.get('SELECT id FROM usuarios WHERE LOWER(email) = ?', [admin_email]);
    if (adminExistente) {
      return res.status(400).json({ error: 'E-mail do administrador já cadastrado' });
    }

    const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const senhaHash = await bcrypt.hash(admin_senha, 10);
    const { clinicaId, userId } = await runTransaction(async transaction => {
    const clinicaResult = await transaction.run(
      `INSERT INTO clinicas (nome, cnpj, telefone, email, status_assinatura, data_expiracao, plano_id) VALUES (?, ?, ?, ?, 'trial', ?, 'free')`,
      [clinica_nome, clinica_cnpj, clinica_telefone, clinica_email, trialExpiresAt]
    );
    const clinicaId = clinicaResult.lastID;

    const userResult = await transaction.run(
      `INSERT INTO usuarios (clinica_id, nome, email, senha, perfil) VALUES (?, ?, ?, ?, 'admin')`,
      [clinicaId, admin_nome, admin_email, senhaHash]
    );
    const userId = userResult.lastID;
    await transaction.run('INSERT INTO configuracoes (clinica_id, nome_clinica, telefone, email) VALUES (?, ?, ?, ?)', [clinicaId, clinica_nome, clinica_telefone || null, clinica_email || null]);
    return { clinicaId, userId };
    });

      const token = jwt.sign(
      { id: userId, email: admin_email, nome: admin_nome, perfil: 'admin', clinica_id: clinicaId },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({ 
      success: true, 
      message: 'Clínica cadastrada com sucesso!',
      token,
      usuario: {
        id: userId,
        nome: admin_nome,
        email: admin_email,
        perfil: 'admin'
      },
      clinica: {
        id: clinicaId,
        nome: clinica_nome,
        status_assinatura: 'trial',
        data_expiracao: trialExpiresAt,
        plano_id: 'free',
        onboarding_concluido: 0
      }
    });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const recuperarSenha = async (req, res) => {
  try {
    const { email } = req.body;
    const db = await openDb();
    
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Informe um e-mail válido.' });
    }

    const usuario = await db.get('SELECT id, nome, email FROM usuarios WHERE LOWER(email) = ?', [normalizedEmail]);
    if (!usuario) {
      return res.status(202).json({ success: true, message: 'Se o e-mail estiver cadastrado, as instruções serão enviadas.' });
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await db.run('DELETE FROM password_reset_tokens WHERE user_id = ?', [usuario.id]);
    await db.run(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [usuario.id, tokenHash, Date.now() + 60 * 60 * 1000]
    );
    
    try {
      await enviarEmailRecuperacao(usuario.email, usuario.nome, rawToken);
    } catch (emailError) {
      await db.run('DELETE FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL', [tokenHash]);
      console.error('Falha ao enviar e-mail de recuperação:', emailError.code || emailError.message);
      return res.status(503).json({ error: 'O serviço de e-mail está indisponível. Tente novamente mais tarde.' });
    }

    res.status(202).json({ success: true, message: 'Se o e-mail estiver cadastrado, as instruções serão enviadas.' });
  } catch (error) {
    console.error('Erro na recuperação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const resetarSenha = async (req, res) => {
  try {
    const { token, novaSenha } = req.body;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/;
    if (typeof novaSenha !== 'string' || !passwordRegex.test(novaSenha)) {
      return res.status(400).json({ error: 'Senha fraca. Use ao menos 8 caracteres, maiúscula, minúscula, número e símbolo.' });
    }
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({ error: 'Token inválido ou expirado.' });
    }
    const db = await openDb();
    const senhaHash = await bcrypt.hash(novaSenha, 12);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const resetToken = await db.get(
      'SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?',
      [tokenHash, Date.now()]
    );
    if (!resetToken) return res.status(400).json({ error: 'Token inválido ou expirado.' });
    const changed = await runTransaction(async (tx) => {
      const claimed = await tx.run(
        'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ? AND used_at IS NULL AND expires_at > ?',
        [resetToken.id, Date.now()]
      );
      if (!claimed.changes) return false;
      const updated = await tx.run(
        'UPDATE usuarios SET senha = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [senhaHash, resetToken.user_id]
      );
      return updated.changes > 0;
    });
    if (!changed) return res.status(400).json({ error: 'Token inválido ou expirado.' });
    return res.json({ success: true, message: 'Senha alterada com sucesso!' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    return res.status(400).json({ error: 'Token inválido ou expirado.' });
  }
};

export const concluirOnboarding = async (req, res) => {
  try {
    const db = await openDb();
    const clinica_id = req.usuario.clinica_id;

    await db.run('UPDATE clinicas SET onboarding_concluido = 1 WHERE id = ?', [clinica_id]);

    res.json({ success: true, message: 'Onboarding concluído com sucesso' });
  } catch (error) {
    console.error('Erro ao concluir onboarding:', error);
    res.status(500).json({ error: 'Erro ao processar requisição' });
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
