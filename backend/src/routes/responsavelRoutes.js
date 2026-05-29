// backend/src/routes/responsavelRoutes.js
import express from 'express';
import {
  getAllResponsaveis,
  getResponsavelById,
  createResponsavel,      // ← Deve vir do responsavelController
  updateResponsavel,
  deleteResponsavel
} from '../controllers/responsavelController.js';  // ← Caminho correto
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getAllResponsaveis);
router.get('/:id', getResponsavelById);
router.post('/', createResponsavel);    // ← POST /api/responsaveis
router.put('/:id', updateResponsavel);
router.delete('/:id', deleteResponsavel);

export default router;