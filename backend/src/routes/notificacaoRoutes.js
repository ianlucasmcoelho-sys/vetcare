// backend/src/routes/notificacaoRoutes.js
import express from 'express';
import {
  getNotificacoes,
  getNotificacoesNaoLidas
} from '../controllers/notificacaoController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getNotificacoes);
router.get('/nao-lidas', getNotificacoesNaoLidas);

export default router;