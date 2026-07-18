import express from 'express';
import {
  getAllBanhoTosa,
  createBanhoTosa,
  updateBanhoTosaStatus,
  deleteBanhoTosa
} from '../controllers/banhoTosaController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requirePremiumFeature } from '../middlewares/subscriptionMiddleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(requirePremiumFeature);

// As rotas do Banho e Tosa são exclusivas para o plano Vet Complete
// Vamos proteger usando o middleware na rota base no index.js ou aqui
// Mas como já temos o requirePremiumFeature no index.js, não precisa aqui.

router.get('/', getAllBanhoTosa);
router.post('/', createBanhoTosa);
router.patch('/:id/status', updateBanhoTosaStatus);
router.delete('/:id', deleteBanhoTosa);

export default router;
