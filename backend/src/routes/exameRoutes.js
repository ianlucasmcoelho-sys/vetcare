import express from 'express';
import { 
  getAllExames, 
  getExamesByAnimal, 
  createExame, 
  updateExame, 
  deleteExame 
} from '../controllers/exameController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getAllExames);
router.get('/animal/:animalId', getExamesByAnimal);
router.post('/', createExame);
router.put('/:id', updateExame);
router.delete('/:id', deleteExame);

export default router;
