// Hostinger loads the configured entry file with require(). Keep this wrapper
// CommonJS and use dynamic import because the backend is ESM with top-level await.
import('./backend/src/index.js').catch((error) => {
  console.error('Falha ao carregar o backend VetCare:', error);
  process.exit(1);
});
