// Enforce the same write permissions as the UI, including direct API requests.
export const allowWrites = (...roles) => (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || roles.includes(req.usuario?.perfil)) return next();
  return res.status(403).json({ error: 'Seu perfil não tem permissão para alterar estes registros.' });
};
