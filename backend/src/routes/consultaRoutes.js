import { allowWrites } from '../middlewares/roleMiddleware.js';
import express from 'express';
import {
  getAllConsultas,
  getConsultaById,
  createConsulta,
  updateConsulta,
  deleteConsulta
} from '../controllers/consultaController.js';
import { listResponsaveisSimples } from '../controllers/responsavelController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(allowWrites('admin', 'veterinario'));

// Rotas de consulta
router.get('/', getAllConsultas);
router.get('/:id', getConsultaById);
router.post('/', createConsulta);
router.put('/:id', updateConsulta);
router.delete('/:id', deleteConsulta);

// Rota para listar responsáveis (simples)
router.get('/responsaveis/simples', listResponsaveisSimples);

export default router;