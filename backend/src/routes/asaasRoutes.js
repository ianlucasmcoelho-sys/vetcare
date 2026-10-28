import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { openDb, runTransaction } from '../db.js';
import { createAsaasGateway, billingConfiguration } from '../services/asaas.js';
import { createBillingService } from '../services/subscriptionBilling.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

async function billingAdmin(req,res,next) {
  try {
    const user=await (await openDb()).get('SELECT perfil, ativo FROM usuarios WHERE id = ? AND clinica_id = ?',[req.usuario.id,req.usuario.clinica_id]);
    if (user?.perfil !== 'admin' || Number(user.ativo) !== 1) return res.status(403).json({error:'Somente um administrador ativo pode gerenciar pagamentos.'});
    next();
  } catch { res.status(503).json({error:'Não foi possível verificar o acesso aos pagamentos.'}); }
}

export function createBillingRouter({
  billing = createBillingService({openDb,runTransaction,gateway:createAsaasGateway()}),
  authenticate = authMiddleware,
  authorize = billingAdmin,
  webhookToken = () => process.env.ASAAS_WEBHOOK_TOKEN
} = {}) {
const router = express.Router();
// Public deployment diagnostics contain no credentials or customer information.
router.get('/configuration',(_req,res)=>{
  const config=billingConfiguration();
  res.set('Cache-Control','no-store').json({billingVersion:2,configured:config.configured,environment:config.sandbox?'sandbox':config.url==='https://api.asaas.com/v3'?'production':'unconfigured'});
});
const handle = fn => async (req,res) => {
  try { res.json(await fn(req)); }
  catch (error) { res.status(error.httpStatus || 500).json({error:error.httpStatus ? error.message : 'Não foi possível processar o pagamento. Tente recuperar a cobrança antes de pagar novamente.'}); }
};
router.get('/status',authenticate,handle(req=>billing.status(req.usuario.clinica_id,req.query.payment_id)));
router.get('/checkout',authenticate,authorize,handle(req=>billing.resume(req.usuario.clinica_id)));
router.post('/subscribe',authenticate,authorize,rateLimit({windowMs:60000,max:5,standardHeaders:true,legacyHeaders:false,message:{error:'Aguarde um minuto antes de tentar novamente.'}}),handle(req=>billing.subscribe(req.usuario.clinica_id,req.body,req.ip)));
router.post('/webhook',(req,res,next)=>{
  const expected=webhookToken();
  const received=req.get('asaas-access-token');
  if (!expected) return res.status(503).json({error:'Webhook não configurado.'});
  if (!received || Buffer.byteLength(expected)!==Buffer.byteLength(received) || !timingSafeEqual(Buffer.from(expected),Buffer.from(received))) return res.status(401).json({error:'Token de webhook inválido.'});
  next();
},handle(req=>billing.webhook(req.body)));
return router;
}
export default createBillingRouter();
