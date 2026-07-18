import express from 'express';
import { getClientesSumidos, getCampanhasVacina, getCRMMetrics } from '../controllers/crmController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requirePremiumFeature } from '../middlewares/subscriptionMiddleware.js';

const router = express.Router();
router.use(authMiddleware);
router.use(requirePremiumFeature);

router.get('/sumidos', getClientesSumidos);
router.get('/vacinas', getCampanhasVacina);
router.get('/metrics', getCRMMetrics);

export default router;
