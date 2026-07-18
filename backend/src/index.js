// backend/src/index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initDb } from './db.js';

// Importação de Rotas
import authRoutes from './routes/authRoutes.js';
import responsavelRoutes from './routes/responsavelRoutes.js';
import animalRoutes from './routes/AnimalRoutes.js';
import consultaRoutes from './routes/consultaRoutes.js';
import prontuarioRoutes from './routes/prontuarioRoutes.js';
import vacinaRoutes from './routes/vacinaRoutes.js';
import retornoRoutes from './routes/retornoRoutes.js';
import agendamentoRoutes from './routes/agendamentoRoutes.js';
import servicoRoutes from './routes/servicoRoutes.js';
import financeiroRoutes from './routes/financeiroRoutes.js';
import receituarioRoutes from './routes/receituarioRoutes.js';
import relatorioRoutes from './routes/relatorioRoutes.js';
import configuracaoRoutes from './routes/configuracaoRoutes.js';
import internacaoRoutes from './routes/internacaoRoutes.js';
import exameRoutes from './routes/exameRoutes.js';
import estoqueRoutes from './routes/estoqueRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import crmRoutes from './routes/crmRoutes.js';
import anexoRoutes from './routes/anexoRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import orcamentoRoutes from './routes/orcamentoRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import comissoesRoutes from './routes/comissoesRoutes.js';
import banhoTosaRoutes from './routes/banhoTosaRoutes.js';
import { handleStripeWebhook } from './controllers/stripeWebhook.js';

// Importação dinâmica de rotas opcionais
let backupRoutes, notificacaoRoutes, templateRoutes;
try {
  backupRoutes = (await import('./routes/backupRoutes.js')).default;
} catch (e) { /* Opcional */ }
try {
  notificacaoRoutes = (await import('./routes/notificacaoRoutes.js')).default;
} catch (e) { /* Opcional */ }
try {
  templateRoutes = (await import('./routes/templateRoutes.js')).default;
} catch (e) { /* Opcional */ }

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middlewares Globais de Infraestrutura ---
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- Camada de Segurança de Produção ---
app.use(helmet({
  crossOriginResourcePolicy: false, // Necessário para exibir imagens locais de uploads
}));

// Limitar tentativas de Brute Force no Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});
app.use('/api/auth/login', loginLimiter);

// --- Webhooks Externos (Devem vir ANTES do express.json() para preservar o body Raw) ---
app.post('/api/pagamento/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// --- Middlewares Padrão (JSON Parsing) ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
  console.log(`🔍 [${req.method}] ${req.url}`);
  next();
});

// Definição de Rotas API
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/responsaveis', responsavelRoutes);
app.use('/api/animais', animalRoutes);
app.use('/api/consultas', consultaRoutes);
app.use('/api/prontuarios', prontuarioRoutes);
app.use('/api/vacinas', vacinaRoutes);
app.use('/api/retornos', retornoRoutes);
app.use('/api/agendamentos', agendamentoRoutes);
app.use('/api/servicos', servicoRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/receituario', receituarioRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/configuracoes', configuracaoRoutes);
app.use('/api/internacoes', internacaoRoutes);
app.use('/api/exames', exameRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/anexos', anexoRoutes);
app.use('/api/orcamentos', orcamentoRoutes);
app.use('/api/pagamento', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/comissoes', comissoesRoutes);
app.use('/api/banhotosa', banhoTosaRoutes);

// Servir arquivos estáticos (Uploads)
app.use('/uploads', express.static('uploads'));

// Registro de Rotas Opcionais
if (backupRoutes) app.use('/api/backup', backupRoutes);
if (notificacaoRoutes) app.use('/api/notificacoes', notificacaoRoutes);
if (templateRoutes) app.use('/api/templates', templateRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), message: 'Servidor VetCare operante!' });
});

// Tratamento de Erro Global
app.use((err, req, res, next) => {
  console.error('❌ [Erro Crítico]:', err.stack);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: err.message,
    path: req.path
  });
});

/**
 * Inicialização Atômica do Servidor
 */
async function startServer() {
  try {
    console.log("🚀 Iniciando VetCare Backend...");
    await initDb();
    console.log('✅ Banco de dados sincronizado e pronto.');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✨ Servidor rodando em http://0.0.0.0:${PORT}`);
      console.log(`📡 Endpoints de API ativos em /api/*`);
      console.log(`🏠 Acesso local: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Falha fatal na inicialização:', error);
    process.exit(1);
  }
}

startServer();
