import { allowWrites } from '../middlewares/roleMiddleware.js';
// backend/src/routes/configuracaoRoutes.js
import express from 'express';
import {
  getConfiguracoes,
  saveConfiguracoes,
  updateLogo
} from '../controllers/configuracaoController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(allowWrites('admin'));

router.get('/', getConfiguracoes);
router.put('/', saveConfiguracoes);
router.put('/logo', updateLogo);

export default router;