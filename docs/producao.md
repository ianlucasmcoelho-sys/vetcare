# Preparação para produção

Este projeto pode ser publicado atrás de Nginx com o frontend estático e o backend Node.js. A publicação ainda depende de configurar um domínio, PostgreSQL, SMTP, credenciais de pagamento e um provedor de backup fora deste repositório.

## Requisitos

- Node.js 22.12.0 ou superior e npm. O Puppeteer usado pela integração de WhatsApp exige esse mínimo.
- PostgreSQL gerenciado com backups automáticos habilitados e restauração testada.
- Domínio com HTTPS. Configure o certificado antes de habilitar o servidor TLS no Nginx.
- SMTP autenticado para recuperação de senha.
- Uma chave JWT aleatória com pelo menos 32 bytes (`openssl rand -hex 32`).
- Chaves e webhooks do Asaas ou Stripe, conforme os meios de pagamento habilitados.

## Configuração

1. Copie `backend/.env.example` para `backend/.env` e preencha os valores reais fora do controle de versão. Nunca publique esse arquivo nem credenciais em logs.
2. Defina `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS` (somente os domínios HTTPS reais), SMTP e os tokens/chaves dos provedores utilizados.
3. Para PostgreSQL com TLS, use `PGSSL=true`. Se o provedor exigir uma CA própria, baixe o certificado raiz nas configurações SSL do banco e configure `PGSSL_CA_BASE64` com o conteúdo PEM codificado em base64. A validação do certificado permanece habilitada.
4. Defina `FRONTEND_URL` para o domínio público. `HOST=127.0.0.1` e `TRUST_PROXY_HOPS=1` são os valores esperados para esta configuração com um Nginx local.
5. Configure no painel do provedor de pagamentos o webhook HTTPS correspondente e valide a URL e o segredo antes de abrir a cobrança a clientes.

## Conta administradora vitalícia

Para provisionar a conta de administração no PostgreSQL configurado para o app, defina temporariamente `LIFETIME_ADMIN_EMAIL` e `LIFETIME_ADMIN_PASSWORD` nas variáveis de ambiente do Node.js e reimplante. O backend cria a conta no primeiro start, usa transação e grava somente o hash bcrypt da senha. Ele se recusa a provisionar sem `DATABASE_URL`, para evitar gravar no SQLite local por engano. Depois de confirmar o acesso, remova as duas variáveis temporárias. Se tiver acesso ao terminal do servidor, também pode executar `npm run provision:lifetime-admin` na raiz do projeto.

O cadastro Free oferece sete dias de teste sem cartão; após esse prazo, as rotas protegidas bloqueiam o acesso até a contratação. O plano pago único custa R$ 97 por mês; confirme que o webhook do Asaas está apontando para `/api/asaas/webhook` antes de testar a ativação automática. A recuperação de senha depende de SMTP funcional e de `FRONTEND_URL` com o domínio público correto.

## Teste no Web App da Hostinger

O plano Web/Cloud executa a aplicação Node.js e pode receber um domínio temporário, mas não hospeda PostgreSQL local. Use um PostgreSQL externo para o teste (a Hostinger documenta a conexão com Supabase) ou hospede o PostgreSQL em um VPS. Para o fluxo de domínio temporário:

1. No hPanel, crie um Web App Node.js e escolha o domínio temporário. A opção de importar GitHub ou enviar um ZIP aparece na tela do anexo; o plano precisa incluir Node.js Web App.
2. Para GitHub, publique primeiro este projeto em um repositório privado com as alterações de implantação incluídas. Para ZIP, envie a raiz do projeto sem `node_modules`, `.env`, banco SQLite nem dados da clínica.
3. Configure o diretório raiz como a raiz do repositório, Node.js `22.12` ou superior, build command `npm run build` e arquivo de entrada `index.cjs`. Esse wrapper CommonJS carrega o backend ESM com `import()` assíncrono, como exigido pelo inicializador da Hostinger. O build instala os pacotes do backend e do frontend usando os respectivos lockfiles e depois compila o Vite.
4. Nas variáveis do app, use `NODE_ENV=production`, a `DATABASE_URL` PostgreSQL do pooler, `PGSSL=true`, `HOST=0.0.0.0`, `PORT=3000`, `TRUST_PROXY_HOPS=1`, um `JWT_SECRET` novo e os valores reais de `FRONTEND_URL` e `ALLOWED_ORIGINS` para o domínio temporário HTTPS. Não configure `VITE_API_URL` para a homologação na mesma origem; a aplicação usa automaticamente `https://<domínio-temporário>/api`.
5. Faça o primeiro deploy e confira `/api/health`. Depois teste fluxos com dados fictícios. Não use dados reais de tutores, pacientes ou documentos neste ambiente temporário.

O backend serve o frontend gerado pelo Vite quando `frontend/dist` está presente. Os anexos, entretanto, ficam no disco local do app; como cada deploy cria uma nova versão do app, use somente anexos descartáveis no teste. Antes da operação real, configure armazenamento persistente externo para os arquivos e verifique a política de retenção do provedor.

O Web App gerenciado da Hostinger não oferece WebSockets de entrada nem processos persistentes de worker. A sessão do WhatsApp Web do VetCare depende de um navegador e conexão em execução contínua; trate essa integração como indisponível para validação nesse plano e faça o teste completo dela em VPS/ambiente compatível. O teste na Hostinger serve para interface, API, login e banco de staging.

## Build e publicação

```bash
npm ci
npm ci --prefix backend
npm ci --prefix frontend
npm --prefix frontend run build
pm2 start ecosystem.config.cjs --env production
pm2 startup
pm2 save
```

Configure `docs/nginx-vetcare.conf` substituindo domínio, diretório do frontend e caminhos dos certificados. A API fica no loopback `127.0.0.1:3001`; o Nginx deve encaminhar `/api/` e `/uploads/` para esse endereço. A aplicação exige os valores de produção acima e encerra a inicialização quando faltam configurações críticas.

## Banco de dados e backups

O backend não converte automaticamente o arquivo SQLite atual para PostgreSQL. Planeje e valide a migração dos dados em uma cópia, confira contagens e relacionamentos, e só então aponte a produção para o banco migrado. O esquema ainda é inicializado por DDL no start; mudanças futuras devem ser aplicadas com migrações versionadas e revisadas antes do deploy.

Configure backups automáticos no serviço PostgreSQL, retenção conforme a política do cliente e teste restauração em um ambiente isolado. `backup_db.js` é exclusivamente para o SQLite local e não deve ser usado como backup de produção. Não exponha backups nem o banco SQLite por HTTP.

## Verificação pós-deploy

- Acesse `/api/health` e confirme `status: ok` e `database: connected`.
- Faça login e confira isolamento de dados entre clínicas com contas de teste distintas.
- Teste recuperação de senha pelo SMTP, upload e download autenticado de anexo, agenda, estoque e operações financeiras.
- Use somente eventos de teste/sandbox para verificar webhooks e confira idempotência antes de habilitar cobranças reais.
- Confirme logs, alertas, backup e restauração antes de considerar a operação pronta.

Esta lista não substitui a validação contratual/fiscal do emissor de notas fiscais nem a homologação dos fluxos reais de cobrança. Não habilite essas integrações até validar credenciais, ambiente e requisitos do provedor.
