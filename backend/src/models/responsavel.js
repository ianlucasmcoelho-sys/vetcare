// backend/src/routes/responsavelRoutes.js
import express from 'express';
import {
  getAllResponsaveis,
  getResponsavelById,
  createResponsavel,
  updateResponsavel,
  deleteResponsavel
} from '../controllers/responsavelController.js';

const router = express.Router();

router.get('/', getAllResponsaveis);
router.get('/:id', getResponsavelById);
router.post('/', createResponsavel);
router.put('/:id', updateResponsavel);
router.delete('/:id', deleteResponsavel);

export default router;