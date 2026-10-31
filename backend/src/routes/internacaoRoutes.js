import express from 'express';
import { 
  getInternacoesAtivas, 
  getHistoricoInternacoes, 
  getInternacaoDetalhes,
  createInternacao, 
  updateInternacao, 
  deleteInternacao,
  agendarMedicacao,
  editarMedicacao,
  aplicarMedicacao,
  registrarSinaisVitais,
  editarSinaisVitais
} from '../controllers/internacaoController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requirePremiumFeature } from '../middlewares/subscriptionMiddleware.js';

const router = express.Router();

router.use(authMiddleware, requirePremiumFeature);

router.get('/ativas', getInternacoesAtivas);
router.get('/historico', getHistoricoInternacoes);
router.get('/:id', getInternacaoDetalhes);
router.post('/', createInternacao);
router.put('/:id', updateInternacao);
router.delete('/:id', deleteInternacao);

// Rotas de monitoramento clínico
router.post('/medicacao', agendarMedicacao);
router.put('/medicacao/:id', editarMedicacao);
router.patch('/medicacao/:id/aplicar', aplicarMedicacao);
router.post('/sinais-vitais', registrarSinaisVitais);
router.put('/sinais-vitais/:id', editarSinaisVitais);

export default router;
