import express from 'express';
import { 
  getInternacoesAtivas, 
  getHistoricoInternacoes, 
  getInternacaoDetalhes,
  createInternacao, 
  updateInternacao, 
  deleteInternacao,
  agendarMedicacao,
  aplicarMedicacao,
  registrarSinaisVitais
} from '../controllers/internacaoController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/ativas', getInternacoesAtivas);
router.get('/historico', getHistoricoInternacoes);
router.get('/:id', getInternacaoDetalhes);
router.post('/', createInternacao);
router.put('/:id', updateInternacao);
router.delete('/:id', deleteInternacao);

// Rotas de monitoramento clínico
router.post('/medicacao', agendarMedicacao);
router.patch('/medicacao/:id/aplicar', aplicarMedicacao);
router.post('/sinais-vitais', registrarSinaisVitais);

export default router;
