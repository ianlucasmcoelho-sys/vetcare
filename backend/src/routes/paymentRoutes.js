import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
const router = express.Router();
// Billing uses Asaas exclusively. Retired simulations must never grant access.
router.post(['/checkout','/mock-webhook-success'],authMiddleware,(_req,res)=>res.status(410).json({error:'Fluxo de pagamento descontinuado. Use o checkout Asaas em /checkout.'}));
export default router;
