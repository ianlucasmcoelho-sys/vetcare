import express from 'express';
import { openDb, runTransaction } from '../db.js';
import { criarCliente, criarAssinatura, getPagamentoDaAssinatura, getPixQrCode } from '../services/asaas.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/status', authMiddleware, async (req, res) => {
  try {
    const db = await openDb();
    const clinic = await db.get(
      'SELECT status_assinatura, plano_id, data_expiracao FROM clinicas WHERE id = ?',
      [req.usuario.clinica_id]
    );
    if (!clinic) return res.status(404).json({ error: 'Clínica não encontrada.' });
    return res.json(clinic);
  } catch (error) {
    console.error('Erro ao consultar status da assinatura:', error.message);
    return res.status(500).json({ error: 'Não foi possível consultar a assinatura.' });
  }
});

/**
 * Assinar o sistema
 * Recebe: nome, cpfCnpj, email, postalCode, addressNumber, e id da clinica (autenticado)
 */
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { nome, cpfCnpj, email, postalCode, addressNumber, planoId, billingType = 'PIX', creditCard, creditCardHolderInfo } = req.body;
    const clinicaId = req.usuario?.clinica_id;
    
    if (!clinicaId || !cpfCnpj || !['complete', 'clinica', 'pro', 'premium'].includes(planoId)) {
      return res.status(400).json({ error: 'Dados incompletos para assinatura.' });
    }
    if (!['PIX', 'CREDIT_CARD'].includes(billingType)) {
      return res.status(400).json({ error: 'Forma de pagamento inválida.' });
    }

    const db = await openDb();
    const clinica = await db.get('SELECT * FROM clinicas WHERE id = ?', [clinicaId]);

    if (!clinica) {
      return res.status(404).json({ error: 'Clínica não encontrada.' });
    }

    const valorPlano = 97.00;

    let customerId = clinica.asaas_customer_id;

    // Se não tiver cliente no Asaas, cria um
    if (!customerId) {
      const customer = await criarCliente({
        name: nome || clinica.nome,
        cpfCnpj: cpfCnpj,
        email: email || clinica.email,
        postalCode: postalCode,
        addressNumber: addressNumber
      });
      customerId = customer.id;
      
      // Atualiza o banco
      await db.run('UPDATE clinicas SET asaas_customer_id = ? WHERE id = ?', [customerId, clinicaId]);
    }

    let subscriptionId = clinica.asaas_subscription_id;

    const cycle = 'MONTHLY';

    // Uma única assinatura ativa por clínica; o valor e ciclo são os mesmos para todas.
    if (!subscriptionId) {
      const subscription = await criarAssinatura(customerId, valorPlano, billingType, cycle, creditCard, creditCardHolderInfo);
      subscriptionId = subscription.id;

      await db.run('UPDATE clinicas SET asaas_subscription_id = ? WHERE id = ?', [subscriptionId, clinicaId]);
    }

    if (billingType === 'CREDIT_CARD') {
       return res.json({ 
         message: 'Assinatura criada com sucesso e pagamento em processamento!',
         subscriptionId
       });
    }

    // Buscar o pagamento pendente desta assinatura para gerar o Pix
    const pagamento = await getPagamentoDaAssinatura(subscriptionId);
    
    if (pagamento) {
      const pix = await getPixQrCode(pagamento.id);
      return res.json({ 
        message: 'Assinatura criada/recuperada com sucesso!',
        subscriptionId,
        pix: {
          encodedImage: pix.encodedImage, // Imagem Base64
          payload: pix.payload // Copia e Cola
        }
      });
    }

    res.json({ message: 'Assinatura já está ativa ou sem pagamentos pendentes.' });

  } catch (error) {
    console.error('Erro na rota de assinatura:', error);
    res.status(500).json({ error: 'Erro ao processar assinatura.' });
  }
});

/**
 * Webhook do Asaas (Recebe notificações de pagamentos)
 */
router.post('/webhook', async (req, res) => {
  try {
    // Validação de Segurança do Webhook (Asaas Access Token)
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    const receivedToken = req.headers['asaas-access-token'];

    if (!expectedToken) {
      console.error('[ASAAS Webhook] ASAAS_WEBHOOK_TOKEN não configurado.');
      return res.status(503).json({ error: 'Webhook não configurado.' });
    }
    if (!receivedToken || receivedToken !== expectedToken) {
      console.warn('[ASAAS Webhook] Requisição rejeitada: token ausente ou inválido.');
      return res.status(401).json({ error: 'Token de webhook inválido' });
    }

    const evento = req.body.event;
    const pagamento = req.body.payment;

    if (!pagamento || !pagamento.subscription) {
      return res.json({ received: true });
    }
    const eventId = req.body.id;
    if (typeof eventId !== 'string' || !eventId) return res.status(400).json({ error: 'Identificador do evento ausente.' });

    const outcome = await runTransaction(async (db) => {
      const inserted = await db.run(
        'INSERT INTO processed_webhook_events (provider, event_id) VALUES (?, ?) ON CONFLICT(provider, event_id) DO NOTHING',
        ['asaas', eventId]
      );
      if (!inserted.changes) return 'duplicate';

      if (evento === 'PAYMENT_RECEIVED' || evento === 'PAYMENT_CONFIRMED') {
        const clinic = await db.get('SELECT id, data_expiracao FROM clinicas WHERE asaas_subscription_id = ?', [pagamento.subscription]);
        const currentExpiry = clinic?.data_expiracao ? new Date(clinic.data_expiracao) : new Date();
        const expiry = Number.isNaN(currentExpiry.getTime()) || currentExpiry < new Date() ? new Date() : currentExpiry;
        expiry.setDate(expiry.getDate() + 32);
        await db.run(
          "UPDATE clinicas SET status_assinatura = 'active', data_expiracao = ?, plano_id = 'complete' WHERE asaas_subscription_id = ?",
          [expiry.toISOString(), pagamento.subscription]
        );
      } else if (evento === 'PAYMENT_OVERDUE') {
        await db.run(
          "UPDATE clinicas SET status_assinatura = 'vencido' WHERE asaas_subscription_id = ?",
          [pagamento.subscription]
        );
      }
      return 'processed';
    });
    if (outcome === 'duplicate') return res.json({ received: true, duplicate: true });

    res.json({ received: true });
  } catch (error) {
    console.error('Erro no webhook Asaas:', error);
    res.status(500).send('Webhook Error');
  }
});

export default router;
