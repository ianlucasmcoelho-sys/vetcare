// backend/src/routes/prontuarioRoutes.js
import express from 'express';
import {
  getAllProntuarios,
  getProntuarioById,
  getProntuariosByPet,
  getProntuariosByAnimalId,
  createProntuario,
  updateProntuario,
  deleteProntuario
} from '../controllers/prontuarioController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// Rotas de prontuários
router.get('/', getAllProntuarios);
router.get('/:id', getProntuarioById);
router.get('/pet/:petNome', getProntuariosByPet);
router.get('/animal/:animalId', getProntuariosByAnimalId);
router.post('/', createProntuario);
router.put('/:id', updateProntuario);
router.delete('/:id', deleteProntuario);

export default router;