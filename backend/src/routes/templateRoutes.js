import { allowWrites } from '../middlewares/roleMiddleware.js';
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
const upload = multer({ dest: 'uploads/', limits: { fileSize: 1024 * 1024, files: 1 }, fileFilter: (req, file, cb) => {
  if (!/\.html?$/i.test(file.originalname)) return cb(Object.assign(new Error('Envie um arquivo HTML.'), { status: 400 }));
  cb(null, true);
} });

router.use(authMiddleware);
router.use(allowWrites('admin'));

router.get('/', listarTemplates);
router.get('/ativo/:tipo', getTemplateAtivo);
router.post('/', criarTemplate);
router.put('/:id', atualizarTemplate);
router.delete('/:id', deletarTemplate);
router.post('/upload', upload.single('arquivo'), uploadTemplate);

export default router;
