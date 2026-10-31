# VetCare Gestão — acesso e instalação

Aplicativo empresarial exclusivo dos sócios do VetCare, para Windows 10/11 de 64 bits.

## Downloads

- [Instalador com atalhos](https://github.com/ianlucasmcoelho-sys/vetcare/releases/download/desktop-v1.0.0/VetCare-Gestao-Instalador-1.0.0.exe)
- [Versão portátil, sem instalação](https://github.com/ianlucasmcoelho-sys/vetcare/releases/download/desktop-v1.0.0/VetCare-Gestao-Portatil-1.0.0.exe)
- [Todos os arquivos e hashes SHA-256](https://github.com/ianlucasmcoelho-sys/vetcare/releases/tag/desktop-v1.0.0)

Escolha uma das duas versões. O aplicativo já inclui seu runtime; não é necessário instalar Node.js, configurar banco local ou criar outro site. Esta versão não possui assinatura digital comercial.

## Logins dos sócios

| Sócio | E-mail de login |
| --- | --- |
| Ian | `ianlucasmcoelho@gmail.com` |
| Mateus | `louzadamateus2@gmail.com` |

**As senhas não estão neste README nem nos arquivos da Release.** O repositório é público. Cada titular deve usar a senha recebida por canal privado; os arquivos iniciais de acesso permanecem somente no computador do responsável pela implantação. Não compartilhe sua senha pelo repositório, issues ou comentários.

As duas contas foram verificadas no servidor em **31/10/2026**, com login, validação de sessão e logout aprovados. As contas de demonstração da prévia local não dão acesso ao aplicativo de produção.

## Entrar e alterar a senha

1. Abra o aplicativo e informe seu e-mail de login e sua senha individual.
2. Na primeira utilização, entre em **Minha conta** e altere a senha inicial. Use pelo menos 12 caracteres.
3. Use **Sair da conta** ao terminar. A troca da senha encerra as outras sessões dessa conta.

É necessária conexão com a internet. As informações vêm de `https://vetcaresistema.com` e são atualizadas automaticamente. O aplicativo não armazena sua senha e exige novo login ao ser reaberto. Uma sessão válida pode durar até 8 horas.

## Se houver dificuldade de acesso

- Confira o e-mail da tabela e a senha individual recebida. O login de uma clínica não substitui a conta empresarial.
- Se perdeu ou alterou sua senha e não a lembra, solicite ao responsável pelo servidor a recuperação da **conta empresarial**; não abra uma issue com seus dados de acesso.
- O erro de sessão PostgreSQL foi corrigido no backend. A API `/api/company/desktop/health` deve informar `authVersion: 2` ou superior. Se o erro voltar, informe ao suporte a mensagem apresentada, sem enviar a senha.
- Os recebimentos e taxas dependem da conciliação com Asaas. Despesas externas sem integração não entram automaticamente, e receita após taxas não representa o lucro total da empresa.

## Conferir o download

Na pasta em que salvou o arquivo, use o PowerShell para calcular seu hash e compare com `VetCare-Gestao-Release-SHA256.txt`, anexado à mesma Release:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath .\VetCare-Gestao-Instalador-1.0.0.exe
```

Para a versão portátil, substitua o nome pelo arquivo `VetCare-Gestao-Portatil-1.0.0.exe`.
