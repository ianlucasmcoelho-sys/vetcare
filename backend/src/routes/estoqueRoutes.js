import express from 'express';
import { registrarMovimentacao, getHistoricoMovimentacoes } from '../controllers/estoqueController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validate, estoqueMovimentacaoSchema } from '../middlewares/validationMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

router.post('/movimentar', validate(estoqueMovimentacaoSchema), registrarMovimentacao);
router.get('/historico', getHistoricoMovimentacoes);

export default router;
