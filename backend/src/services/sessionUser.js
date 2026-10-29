// JWT identifies the session; current access always comes from the database.
export async function currentSessionUser(db, decoded) {
  if (!decoded?.id || !decoded?.clinica_id) return null;
  const user = await db.get(
    'SELECT id, clinica_id, nome, email, perfil, ativo FROM usuarios WHERE id = ? AND clinica_id = ?',
    [decoded.id, decoded.clinica_id]
  );
  if (!user || ![1, true, '1'].includes(user.ativo)) return null;
  const { ativo, ...identity } = user;
  return identity;
}
