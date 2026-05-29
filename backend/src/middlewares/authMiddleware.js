import jwt from 'jsonwebtoken';
const JWT_SECRET = 'vetcare_secret_key_2024';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Validar se o token possui o clinica_id (SaaS)
    if (!decoded.clinica_id) {
      console.warn('⚠️ Token sem clinica_id detectado para usuário:', decoded.email);
      return res.status(401).json({ error: 'Token obsoleto. Por favor, faça login novamente.' });
    }

    req.usuario = decoded;
    next();
  } catch (err) {
    console.error('❌ Erro na validação do token:', err.message);
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

export const adminMiddleware = (req, res, next) => {
  if (req.usuario.perfil !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
};