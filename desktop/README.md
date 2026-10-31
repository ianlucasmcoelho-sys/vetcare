# VetCare Gestão para Windows

Aplicativo independente para os sócios do VetCare. Não exige segundo site, subdomínio, servidor Node local, banco local ou chave empresarial embutida. O aplicativo lê os dados do próprio sistema via HTTPS usando contas individuais de sócios.

## Entrega

- `deployment/VetCare-Gestao-Instalador-1.0.0.exe`: instalador por usuário, sem exigir instalação como administrador, com atalhos na área de trabalho e menu Iniciar.
- `deployment/VetCare-Gestao-Portatil-1.0.0.exe`: executável portátil que extrai seus componentes temporariamente e abre o aplicativo sem instalação.

Destino: Windows 10/11 de 64 bits. O runtime já acompanha o executável; não é preciso instalar Node.js. As versões ainda não possuem assinatura digital comercial. Atualizações são manuais: distribuir um novo instalador/portátil após gerar e verificar a versão. Não há download ou execução automática de atualizações.

**A API e as duas contas empresariais foram verificadas em produção em 31/10/2026**, com login, validação de sessão e logout aprovados. Downloads, e-mails de login e instruções estão em [ACESSO.md](ACESSO.md). Senhas não são publicadas no repositório nem na Release. A conta de demonstração da prévia web não é uma conta válida do aplicativo.

## Como funciona

O aplicativo contém as telas localmente e consulta exclusivamente `https://vetcaresistema.com/api/company/desktop/`. Os dados comerciais continuam no servidor atual. São exibidos os cadastros de clínicas, planos, avaliações, acessos, mensalidades e taxas Asaas de produção, com as mesmas regras e limites descritos em `management/README.md`.

O login empresarial é separado dos usuários/admins de clínicas. A sessão dura até 8 horas, pode ser revogada e é validada no servidor a cada consulta. O token individual fica somente na memória do processo principal do aplicativo, sem arquivo local de credenciais e sem acesso pelo código das telas. Ao fechar o programa, esse token deixa de estar disponível localmente; sessões não encerradas por logout expiram no servidor. Ao sair da conta, a sessão é revogada; a troca de senha revoga as sessões dos dois computadores caso estejam usando a mesma conta — use contas individuais.

As telas ficam isoladas (sandbox, contextIsolation, sem Node.js ou navegação remota); somente operações fixas passam pela ponte IPC. O processo principal faz HTTPS, valida a origem de destino e não segue redirecionamentos. Não há token `COMPANY_API_TOKEN`, senha de banco, chave Asaas ou conta padrão no executável. Permissões do navegador, novas janelas, webviews e navegação externa ficam bloqueadas. O aplicativo exige internet e não promete consulta offline ou sincronização de alterações locais.

CSV financeiro usa a caixa de diálogo do Windows para escolher o destino. Quando a conciliação está incompleta, exportação e totais financeiros ficam indisponíveis. Despesas externas, lucro contábil, saldo disponível no Asaas e livro-caixa histórico de estornos não fazem parte da integração automática atual.

## Ativar no servidor existente

Não é necessária uma aplicação hospedada adicional nem PostgreSQL separado para o aplicativo. As contas e sessões empresariais são criadas em duas tabelas próprias (`company_owner_accounts`, `company_owner_sessions`) no banco do backend existente; elas não alteram as contas das clínicas.

1. Fazer backup do banco hospedado e confirmar o destino `vetcaresistema.com` antes de publicar o backend atualizado, respeitando a regra de confirmação do deploy.
2. A inicialização do backend cria as duas tabelas novas, preservando cadastros, usuários e dados clínicos. As rotas novas são `/api/company/desktop/health`, `/login`, `/me`, `/overview`, `/logout` e `/password`.
3. Provisionar uma conta real para cada sócio no terminal administrativo do backend. O comando recebe JSON via **stdin**, nunca senha em argumentos, arquivo, chat ou histórico. A chave de integração entre servidores da versão web não é necessária para esse login.
4. Validar o `/health`, o login de cada sócio, a recusa de usuários de clínicas e a leitura de dados/Asaas de produção. Entregar o `.exe` para cada computador.

No PowerShell, dentro de `backend/`, com as variáveis corretas do banco hospedado configuradas no ambiente:

```powershell
$ownerName = Read-Host 'Nome do sócio'
$ownerEmail = Read-Host 'E-mail do sócio'
$ownerSecret = Read-Host 'Senha (mínimo 12 caracteres)' -AsSecureString
$ownerCredential = [System.Net.NetworkCredential]::new('', $ownerSecret)
@{ name = $ownerName; email = $ownerEmail; password = $ownerCredential.Password } |
  ConvertTo-Json -Compress | node scripts/provisionCompanyOwner.js
Remove-Variable ownerSecret, ownerCredential
```

Em Linux, use ferramenta de entrada protegida ou gerenciador de segredos para passar o mesmo JSON via stdin. O comando administrativo equivalente é `npm run provision:company-owner`. Se o e-mail já existir, a senha é redefinida e as sessões revogadas. Para desativação emergencial, o administrador deve desativar a conta empresarial no banco e revogar suas sessões; não basta desinstalar o programa. O aplicativo permite alterar a própria senha em Minha conta.

Se a API não estiver publicada, o aplicativo apresenta uma mensagem específica. Falhas de internet não mostram dados inventados. A tela pode abrir offline; os dados atuais e o login precisam de conexão.

## Gerar outra versão

Com Node 22.12+ e npm, no diretório `desktop/`:

```powershell
npm ci
npm test
npm run build
```

O build prepara `ui/` a partir de `management/public/` e gera os executáveis em `desktop/release/`. O instalador/portátil é copiado para `deployment/` somente após a verificação. `desktop/ui/`, `desktop/release/`, `node_modules/`, bancos e credenciais ficam fora do pacote de código. Os `.exe` são entregues separadamente do ZIP de código para não incluir o runtime como dependência local na entrega de fontes.

Para desenvolvimento, `npm start`. Apenas quando não empacotado, `VETCARE_DESKTOP_DEV_ORIGIN` aceita um servidor HTTP em loopback para testes. O executável empacotado ignora essa variável e mantém o destino de produção fixo.

Testes em `desktop/tests/` cobrem restrição de destino/operações, sigilo do token na ponte, consultas, logout e mensagens de falha. Testes do backend em `backend/tests/companyDesktop.test.js` cobrem contas próprias, senhas, revogação e recusa de sessões de clínicas. A suíte completa conta com 74 testes aprovados. O backend publicado foi conferido com `authVersion: 2` e as duas contas empresariais autenticaram com sucesso em 31/10/2026.
