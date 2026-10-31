// backend/src/index.js
import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initDb, openDb, closeDatabase } from './db.js';
import { cleanupAllClients } from './services/whatsappManager.js';
import { authMiddleware } from './middlewares/authMiddleware.js';
import { provisionLifetimeAdminFromEnvironment } from './services/lifetimeProvisioner.js';

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
import crmRoutes from './routes/crmRoutes.js';
import anexoRoutes from './routes/anexoRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import orcamentoRoutes from './routes/orcamentoRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import comissoesRoutes from './routes/comissoesRoutes.js';
import banhoTosaRoutes from './routes/banhoTosaRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import asaasRoutes from './routes/asaasRoutes.js';
import notaFiscalRoutes from './routes/notaFiscalRoutes.js';
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
const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 3000 : 3001);
app.set('trust proxy', Number.parseInt(process.env.TRUST_PROXY_HOPS || '0', 10));
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uploadsRoot = path.resolve(backendRoot, 'uploads');
const frontendDistRoot = path.resolve(backendRoot, '..', 'frontend', 'dist');

// --- Middlewares Globais de Infraestrutura ---
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (como mobile apps, curl, ferramentas locais) ou permitidas na lista
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error(`Origem não permitida por CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- Camada de Segurança de Produção ---
app.use(helmet({
  crossOriginResourcePolicy: false, // Necessário para exibir imagens locais de uploads
}));

// --- Rate Limiting em Camadas ---
// 1. Rate Limiting Global da API
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // até 1000 requisições a cada 15 min por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições originadas deste IP. Aguarde alguns instantes.' }
});
app.use('/api', globalLimiter);

// 2. Rate Limiting Específico para Rotas de IA (Proteção de Custos)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // até 20 chamadas por minuto por IP
  message: { error: 'Limite de requisições de IA por minuto atingido. Tente em breve.' }
});
app.use('/api/ai', aiLimiter);

// 3. Limitar tentativas de Brute Force no Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});
app.use('/api/auth/login', loginLimiter);

const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde antes de tentar novamente.' }
});
app.use('/api/auth/recuperar-senha', recoveryLimiter);
app.use('/api/auth/resetar-senha', recoveryLimiter);

// --- Webhooks Externos (Devem vir ANTES do express.json() para preservar o body Raw) ---
app.post('/api/pagamento/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// --- Middlewares Padrão (JSON Parsing) ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
  console.log(`🔍 [${req.method}] ${req.path}`);
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
app.use('/api/crm', crmRoutes);
app.use('/api/anexos', anexoRoutes);
app.use('/api/orcamentos', orcamentoRoutes);
app.use('/api/pagamento', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/comissoes', comissoesRoutes);
app.use('/api/banhotosa', banhoTosaRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/asaas', asaasRoutes);
app.use('/api/notas-fiscais', notaFiscalRoutes);

// Servir arquivos estáticos (Uploads com Autenticação)
app.use('/uploads', authMiddleware, async (req, res, next) => {
  try {
    const relative = req.path.replace(/^\/+/, '').replace(/[\\/]+/g, path.sep);
    const resolved = path.resolve(uploadsRoot, relative);
    const uploadRoot = uploadsRoot + path.sep;
    if (!resolved.startsWith(uploadRoot) || !relative.startsWith('anexos' + path.sep)) {
      return res.status(404).json({ error: 'Arquivo não encontrado.' });
    }
    const db = await openDb();
    const caminhoLegado = path.join('uploads', relative);
    const caminhoAbsoluto = path.join(uploadsRoot, relative);
    const anexo = await db.get(
      'SELECT id FROM anexos WHERE clinica_id = ? AND caminho IN (?, ?)',
      [req.usuario.clinica_id, caminhoAbsoluto, caminhoLegado]
    );
    if (!anexo) return res.status(404).json({ error: 'Arquivo não encontrado.' });
    return next();
  } catch (error) {
    return next(error);
  }
}, express.static(uploadsRoot));

// Registro de Rotas Opcionais
if (backupRoutes) app.use('/api/backup', backupRoutes);
if (notificacaoRoutes) app.use('/api/notificacoes', notificacaoRoutes);
if (templateRoutes) app.use('/api/templates', templateRoutes);

// Health Check com verificação ativa do banco de dados
app.get('/api/health', async (req, res) => {
  try {
    const db = await openDb();
    await db.get('SELECT 1 as alive');
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      database: 'connected',
      message: 'Servidor VetCare e banco de dados operantes!',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ [Falha no Health Check]:', err.message);
    res.status(503).json({
      status: 'error',
      uptime: process.uptime(),
      database: 'disconnected',
      message: 'Banco de dados inacessível ou ocupado',
      timestamp: new Date().toISOString()
    });
  }
});

// Hostinger Web App does not expose a separately managed Nginx frontend.
// Serve the Vite build from this Express process when it is present.
app.use('/api', (req, res) => res.status(404).json({ error: 'Rota da API não encontrada.' }));

if (fs.existsSync(path.join(frontendDistRoot, 'index.html'))) {
  app.use(express.static(frontendDistRoot, {
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.sendFile(path.join(frontendDistRoot, 'index.html'));
  });
}


// Tratamento de Erro Global Sanitizado
app.use((err, req, res, next) => {
  console.error('❌ [Erro Crítico]:', err.stack);
  const isProduction = process.env.NODE_ENV === 'production';
  const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : (err.status || 500);
  const safeError = err.code === 'LIMIT_FILE_SIZE' ? 'O arquivo deve ter no máximo 15 MB.' : (err.message || 'Erro interno do servidor');
  res.status(status).json({
    error: isProduction && status >= 500 ? 'Erro interno do servidor' : safeError,
    ...(isProduction ? {} : { stack: err.stack, path: req.path })
  });
});

/**
 * Inicialização Atômica do Servidor
 */
async function startServer() {
  try {
    console.log("🚀 Iniciando VetCare Backend...");

    // Verificação de Segurança de Inicialização
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET, 'utf8') < 32 || process.env.JWT_SECRET === 'vetcare_secret_key_2024')
        throw new Error('JWT_SECRET precisa ter no mínimo 32 bytes e ser exclusivo.');
      if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL (PostgreSQL) é obrigatório em produção.');
      if (!process.env.ALLOWED_ORIGINS) throw new Error('Configure ALLOWED_ORIGINS com os domínios HTTPS do frontend.');
      const origins = process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());
      if (origins.some((origin) => !origin.startsWith('https://') || /localhost|seudominio|example\.com/i.test(origin)))
        throw new Error('ALLOWED_ORIGINS deve conter somente domínios HTTPS reais.');
    } else if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'vetcare_secret_key_2024') {
      console.warn("⚠️ [AVISO DE SEGURANÇA]: Utilizando chave JWT padrão/desenvolvimento. Configure um JWT_SECRET seguro no .env para produção!");
    }

    await initDb();
    console.log('✅ Banco de dados sincronizado e pronto.');
    const accountProvision = await provisionLifetimeAdminFromEnvironment();
    if (accountProvision === 'created' || accountProvision === 'updated') {
      console.log('✅ Conta administradora vitalícia provisionada.');
    }

    const host = process.env.HOST || '0.0.0.0';
    const server = app.listen(PORT, host, () => {
      console.log(`✨ Servidor rodando em http://${host}:${PORT}`);
      console.log(`📡 Endpoints de API ativos em /api/*`);
    });

    let shuttingDown = false;
    const shutdown = (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`Encerrando servidor (${signal})...`);
      server.close(async (error) => {
        try {
          await cleanupAllClients();
          await closeDatabase();
        } catch (shutdownError) {
          console.error('Falha ao liberar recursos:', shutdownError.message);
          process.exitCode = 1;
        }
        if (error) {
          console.error('Falha ao encerrar servidor:', error.message);
          process.exitCode = 1;
        }
      });
      setTimeout(() => process.exit(1), 30_000).unref();
    };
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Falha fatal na inicialização:', error);
    process.exit(1);
  }
}

startServer();
