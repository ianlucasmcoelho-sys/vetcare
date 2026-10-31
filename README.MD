# VetCare

Sistema de gestão para clínicas veterinárias e pet shops, com agenda, prontuários, cadastro de tutores e animais, estoque, financeiro e integrações.

## Aplicativo Windows — gestão dos sócios

O VetCare Gestão acompanha as clínicas contratantes, assinaturas e mensalidades da empresa pelo sistema publicado.

- [Baixar o instalador ou a versão portátil](https://github.com/ianlucasmcoelho-sys/vetcare/releases/tag/desktop-v1.0.0)
- [Logins e instruções de acesso](desktop/ACESSO.md)
- [Documentação técnica do aplicativo](desktop/README.md)

Os downloads não incluem senhas. Cada sócio utiliza sua própria conta empresarial.

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
