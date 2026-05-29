// backend/src/routes/templateRoutes.js
import express from 'express';
import multer from 'multer';
import {
  listarTemplates,
  getTemplateAtivo,
  criarTemplate,
  atualizarTemplate,
  deletarTemplate,
  uploadTemplate
} from '../controllers/templateController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.use(authMiddleware);

router.get('/', listarTemplates);
router.get('/ativo/:tipo', getTemplateAtivo);
router.post('/', criarTemplate);
router.put('/:id', atualizarTemplate);
router.delete('/:id', deletarTemplate);
router.post('/upload', upload.single('arquivo'), uploadTemplate);

export default router;