import { allowWrites } from '../middlewares/roleMiddleware.js';
// backend/src/routes/financeiroRoutes.js
import express from 'express';
import {
  getAllFinanceiro,
  getFinanceiroById,
  createFinanceiro,
  updateFinanceiro,
  deleteFinanceiro,
  getFinanceiroResumo
} from '../controllers/financeiroController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requirePremiumFeature } from '../middlewares/subscriptionMiddleware.js';

import { validate, financeiroSchema } from '../middlewares/validationMiddleware.js';

const router = express.Router();

router.use(authMiddleware, requirePremiumFeature);
router.use(allowWrites('admin', 'recepcionista'));

router.get('/', getAllFinanceiro);
router.get('/resumo', getFinanceiroResumo);
router.get('/:id', getFinanceiroById);
router.post('/', validate(financeiroSchema), createFinanceiro);
router.put('/:id', validate(financeiroSchema), updateFinanceiro);
router.delete('/:id', deleteFinanceiro);

export default router;
