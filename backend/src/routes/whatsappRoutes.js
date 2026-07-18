// backend/src/routes/whatsappRoutes.js
import express from 'express';
import { 
  enviarWhatsApp, 
  enviarLembreteConsulta,
  enviarLembreteVacina,
  enviarLembreteRetorno 
} from '../services/whatsappService.js';
import { 
  enviarLembretesConsultas, 
  enviarLembretesVacinas, 
  enviarLembretesRetornos 
} from '../jobs/lembreteJobs.js';
import { getConfiguracao, updateConfiguracao, getStatusQr, desconectarWhatsApp } from '../controllers/whatsappController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requirePremiumFeature } from '../middlewares/subscriptionMiddleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(requirePremiumFeature);

// Configuração do WhatsApp
router.get('/configuracao', getConfiguracao);
router.put('/configuracao', updateConfiguracao);

// Conexão Nativa (QR Code)
router.get('/status', getStatusQr);
router.post('/desconectar', desconectarWhatsApp);

// Testar envio de WhatsApp
router.post('/teste', async (req, res) => {
  const { telefone, mensagem } = req.body;
  
  if (!telefone) {
    return res.status(400).json({ error: 'Telefone é obrigatório' });
  }
  
  const resultado = await enviarWhatsApp(telefone, mensagem || '🐾 Teste VetCare - Sistema funcionando! 🐾');
  res.json({ success: !!resultado, resultado });
});

// Disparar lembretes manualmente
router.post('/disparar', async (req, res) => {
  const resultados = {
    consultas: await enviarLembretesConsultas(),
    vacinas: await enviarLembretesVacinas(),
    retornos: await enviarLembretesRetornos()
  };
  
  res.json({ success: true, resultados });
});

export default router;