// backend/src/routes/agendamentoRoutes.js
import express from 'express';
import {
  getAllAgendamentos,
  getAgendamentoById,
  getAgendamentosByData,
  getAgendamentosByPeriodo,
  getAgendamentosByAnimal,
  getAgendamentosByStatus,
  getAgendaHoje,
  getProximosAgendamentos,
  createAgendamento,
  updateAgendamento,
  updateAgendamentoStatus,
  deleteAgendamento
} from '../controllers/agendamentoController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// Rotas de agendamentos
router.get('/', getAllAgendamentos);
router.get('/hoje', getAgendaHoje);
router.get('/proximos', getProximosAgendamentos);
router.get('/data/:data', getAgendamentosByData);
router.get('/periodo', getAgendamentosByPeriodo);
router.get('/animal/:animalId', getAgendamentosByAnimal);
router.get('/status/:status', getAgendamentosByStatus);
router.get('/:id', getAgendamentoById);
router.post('/', createAgendamento);
router.put('/:id', updateAgendamento);
router.patch('/:id/status', updateAgendamentoStatus);
router.delete('/:id', deleteAgendamento);

export default router;