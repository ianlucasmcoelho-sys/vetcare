# VetCare Gestão — integração automática

Aplicação separada para os sócios, com login e banco de autenticação próprios. **O modo padrão agora consulta o sistema VetCare automaticamente.** Não copia cadastros para outro banco e não exige cadastro manual de clínicas, planos ou recebimentos.

## Fluxo

1. O navegador acessa apenas o servidor da gestão, com sessão própria de sócio.
2. A gestão consulta `GET /api/company/overview?month=AAAA-MM` no backend VetCare, usando segredo exclusivo entre servidores.
3. O backend lê os cadastros comerciais atuais e consulta as assinaturas/cobranças vinculadas no Asaas de produção, com cache de 60 segundos e paginação.
4. O painel atualiza a cada 60 segundos enquanto visível e ao voltar à aba. Há também o botão Atualizar.

O segredo nunca é enviado ao navegador. O backend recusa JWTs de usuários das clínicas nessa API e não expõe pacientes, prontuários, senhas ou o financeiro de consultas das clínicas. A API empresarial é somente leitura: não cria cobranças nem altera acessos.

## Informações automáticas

- Clínicas cadastradas, responsável administrador ativo, contato e data de entrada.
- Plano, situação de acesso, avaliação, vitalício, vencimento e status da assinatura no Asaas.
- Receita mensal contratada de assinaturas mensais ativas em produção. Valores efetivos vêm do Asaas; vitalícios, testes e Sandbox não geram MRR.
- Mensalidades confirmadas (`CONFIRMED`/`RECEIVED`) e taxas identificadas (`value - netValue`), pelo mês da data de pagamento informada pelo Asaas.
- Cancelamentos, atrasos e cobranças estornadas/inválidas deixam de contar conforme a situação atual do provedor.

Os totais representam cobranças **atualmente válidas** daquele mês, não um livro-caixa histórico imutável. Estornos retiram a cobrança do mês original; não há lançamento contábil de devolução no mês do estorno. Receita após taxas não é saldo disponível no Asaas nem lucro líquido. Não inclui receitas de consultas das clínicas, despesas bancárias, hospedagem, impostos ou outras despesas externas sem integração específica. Em caso de falha/inconsistência na conciliação, os totais ficam indisponíveis, em vez de apresentar zero ou números incompletos. Valores podem levar até 60 segundos para refletir a fonte; uma consulta que coincida com atualização de cache pode levar mais um ciclo do painel.

Planos comerciais são lidos das regras do backend (inclusive o preço padrão do módulo de cobrança); valores efetivos de cada assinatura vêm do Asaas. Planos não são editados no painel. Os antigos endpoints manuais ficam bloqueados por padrão. `MANAGEMENT_MANUAL_MODE=1` existe apenas para compatibilidade e regressão da primeira versão; não configurar na aplicação integrada.

## Prévia local com dados do sistema

Node 22.12 ou superior. Na raiz do projeto, instale as dependências do backend caso ainda não existam; em seguida, entre em `management/`:

```powershell
npm ci --prefix backend
Set-Location management
npm ci
npm run preview
```

Abra `http://localhost:3010`. Credenciais **somente locais**:

- E-mail: `demo@example.test`
- Senha fictícia: `Demonstracao-local-2026`

A prévia lê `backend/clinica.db` em modo **somente leitura**, sem executar migrações ou alterar dados. Contas e sessões da prévia ficam em memória, com segredo efêmero entre dois servidores em loopback. **Este banco local não é o banco publicado na Hostinger** e pode conter registros de testes anteriores do sistema. O script não utiliza credenciais Asaas de produção; se houver uma assinatura real que precise de conciliação financeira, os valores serão indicados como indisponíveis. Não confundir com a demonstração inicial de dados inventados, já substituída.

A prévia precisa do checkout completo para acessar o banco e a API locais. A aplicação publicada (`npm start`) continua independente e acessa a API via HTTPS; não precisa do código clínico na mesma pasta.

## Conectar ao sistema publicado

Ainda não houve publicação nesta atualização. Para usar os dados da Hostinger, será necessário publicar o backend atualizado e uma aplicação Node.js independente para a gestão.

1. Gerar um segredo aleatório exclusivo com pelo menos 32 caracteres em ferramenta segura. Não utilizar senhas dos sócios, JWT_SECRET nem o token de webhook.
2. No backend clínico, configurar `COMPANY_API_TOKEN` com esse segredo e publicar as rotas/serviços novos. O endpoint sem token deve retornar 401; se o segredo não estiver configurado, retorna 503. O banco clínico não recebe migrações desta integração.
3. Criar a aplicação separada da gestão com `management/` como raiz. Instalação: `npm ci --omit=dev`; início: `npm start`; entrada: `src/server.js`. Não há etapa de build.
4. Configurar `NODE_ENV=production`, `MANAGEMENT_ORIGIN=https://gestao.vetcaresistema.com`, `MANAGEMENT_SOURCE_URL=https://vetcaresistema.com` e `MANAGEMENT_SOURCE_TOKEN` igual ao segredo do backend. O segredo é configurado somente nas variáveis protegidas da hospedagem.
5. Configurar `MANAGEMENT_DATABASE_URL` para PostgreSQL exclusivo de contas/sessões dos sócios. Não compartilhar o banco clínico. Configurar TLS (`MANAGEMENT_PGSSL=true` e CA quando necessária); a verificação de certificado permanece ativa.
6. Configurar `PORT` conforme a plataforma. `MANAGEMENT_TRUST_PROXY=1` somente se houver exatamente um proxy confiável antes do Node.
7. Provisionar as duas contas reais de sócios pelo procedimento abaixo. Não usar a conta local de prévia em produção.
8. Vincular `gestao.vetcaresistema.com`, DNS e HTTPS à aplicação nova. Validar fonte real, acesso dos sócios, atualização após cadastro/pagamento, isolamento de usuários clínicos e persistência de sessões após reinício. Programar backup do PostgreSQL exclusivo da gestão.

Sem fonte configurada ou se a API do sistema falhar, a gestão **não retorna dados fictícios e não volta silenciosamente ao modo manual**. Não utilizar redirecionamentos entre a gestão e a API: o cliente recusa redirecionamento para proteger o segredo. Os dois aplicativos devem estar em HTTPS em produção.

## Contas dos sócios

A aplicação real não tem cadastro público ou senha padrão. `npm run owner` lê JSON pela entrada padrão com `name`, `email` e `password` (12 a 256 caracteres). No PowerShell, dentro de `management/`:

```powershell
$ownerName = Read-Host 'Nome do sócio'
$ownerEmail = Read-Host 'E-mail do sócio'
$ownerSecret = Read-Host 'Senha (mínimo 12 caracteres)' -AsSecureString
$ownerCredential = [System.Net.NetworkCredential]::new('', $ownerSecret)
@{ name = $ownerName; email = $ownerEmail; password = $ownerCredential.Password } |
  ConvertTo-Json -Compress | node scripts/provision-owner.js
Remove-Variable ownerSecret, ownerCredential
```

Se a conta já existir, sua senha será redefinida e as sessões revogadas. Em Linux, fornecer JSON por stdin com ferramenta de entrada oculta ou gerenciador de segredos. Não incluir segredos em argumentos, arquivos ou histórico. O sócio pode alterar sua própria senha em Minha conta. Sessões duram até 8 horas, usam cookie próprio HttpOnly/Secure/SameSite Strict em produção e são revogadas na troca de senha ou logout.

## Verificação

```powershell
npm test
npm audit --omit=dev
```

Os testes da gestão cobrem a consulta HTTP entre aplicações, atualização sem duplicação, bloqueio de alterações manuais e autenticação dos sócios. A suíte do backend inclui proteção da API empresarial, mensalidades, taxas, paginação, deduplicação, Sandbox, vitalício, atrasos, cancelamentos, estornos e falhas de conciliação. PostgreSQL, infraestrutura da Hostinger e consulta ao Asaas real precisam de homologação após publicação. Desenvolvimento local executado em Node 22.11; instalação exige a versão mínima declarada 22.12, como no sistema principal, e o CI usa Node 22.
