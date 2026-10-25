# VetCare

Sistema de gestão para clínicas veterinárias e pet shops, com agenda, prontuários, cadastro de tutores e animais, estoque, financeiro e integrações.

## Desenvolvimento local

Requer Node.js 22.12.0 ou superior.

```bash
npm ci
npm ci --prefix backend
npm ci --prefix frontend
npm --prefix backend start
npm --prefix frontend run dev
```

O backend local usa `backend/clinica.db` (SQLite). Configure `frontend/.env` com as variáveis de ambiente necessárias para integrações opcionais.

## Produção

Leia [docs/producao.md](docs/producao.md) para configurar PostgreSQL, segredos, SMTP, pagamentos, Nginx, PM2 e backups antes da publicação.

Build de produção (instala dependências do backend/frontend e compila o frontend): `npm run build`.

Auditoria das dependências de produção: `npm run audit:production`.
