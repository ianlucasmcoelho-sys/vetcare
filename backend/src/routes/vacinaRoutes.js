// backend/src/routes/vacinaRoutes.js
import express from 'express';
import {
  getAllVacinas,
  getVacinaById,
  getVacinasByAnimal,
  getVacinasByPeriodo,
  getVacinasProximas,
  getVacinasVencidas,
  getVacinasStats,
  createVacina,
  updateVacina,
  deleteVacina
} from '../controllers/vacinaController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// Rotas de vacinas
router.get('/', getAllVacinas);
router.get('/stats', getVacinasStats);
router.get('/proximas', getVacinasProximas);
router.get('/vencidas', getVacinasVencidas);
router.get('/periodo', getVacinasByPeriodo);
router.get('/animal/:animalId', getVacinasByAnimal);
router.get('/:id', getVacinaById);
router.post('/', createVacina);
router.put('/:id', updateVacina);
router.delete('/:id', deleteVacina);

export default router;