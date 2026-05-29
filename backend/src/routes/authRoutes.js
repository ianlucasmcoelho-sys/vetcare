// backend/src/routes/authRoutes.js
import express from 'express';
import {
  login,
  verificarToken,
  criarUsuario,
  listarUsuarios,
  atualizarUsuario,
  deletarUsuario,
  alterarSenha,
  cadastroClinica,
  recuperarSenha,
  resetarSenha,
  logout
} from '../controllers/authController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';
import { validate, loginSchema } from '../middlewares/validationMiddleware.js';

const router = express.Router();

// Rotas públicas
router.post('/login', validate(loginSchema), login);
router.post('/verificar', verificarToken);
router.post('/cadastro-clinica', cadastroClinica);
router.post('/recuperar-senha', recuperarSenha);
router.post('/resetar-senha', resetarSenha);

// Rotas protegidas (requerem autenticação)
router.post('/logout', authMiddleware, logout);
router.put('/usuarios/:id/senha', authMiddleware, alterarSenha);

// Rotas de admin
router.get('/usuarios', authMiddleware, adminMiddleware, listarUsuarios);
router.post('/usuarios', authMiddleware, adminMiddleware, criarUsuario);
router.put('/usuarios/:id', authMiddleware, adminMiddleware, atualizarUsuario);
router.delete('/usuarios/:id', authMiddleware, adminMiddleware, deletarUsuario);

export default router;