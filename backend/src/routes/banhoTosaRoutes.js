import express from 'express';
import {
  getAllBanhoTosa,
  getPublicBanhoTosa,
  createBanhoTosa,
  updateBanhoTosa,
  enviarLinkBanhoTosa,
  updateBanhoTosaStatus,
  setBanhoTosaArquivado,
  deleteBanhoTosa
} from '../controllers/banhoTosaController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requirePaidCompletePlan } from '../middlewares/subscriptionMiddleware.js';

const router = express.Router();

// Link de acompanhamento sem login: retorna somente informações do pet e da etapa atual.
router.get('/acompanhar/:token', getPublicBanhoTosa);
router.use(authMiddleware);
router.use(requirePaidCompletePlan);

router.get('/', getAllBanhoTosa);
router.post('/', createBanhoTosa);
router.put('/:id', updateBanhoTosa);
router.patch('/:id/status', updateBanhoTosaStatus);
router.patch('/:id/arquivado', setBanhoTosaArquivado);
router.post('/:id/enviar-link', enviarLinkBanhoTosa);
router.delete('/:id', deleteBanhoTosa);

export default router;
