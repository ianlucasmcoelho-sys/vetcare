# Pagamentos VetCare — configuração e homologação

A assinatura custa R$ 97,00/mês. Pix gera uma cobrança mensal que o cliente paga manualmente; cartão é recorrente. O valor e ciclo são definidos no servidor. Somente o administrador da clínica inicia ou recupera cobranças. O acesso é liberado pela confirmação autoritativa do Asaas, sem simulações de sucesso no navegador.

## Configuração inicial

O domínio escolhido para o VetCare é `https://vetcaresistema.com`, com webhook em `https://vetcaresistema.com/api/asaas/webhook` e alertas para `equipevetcare@vetcaresistema.com`. O endereço público do site não muda o ambiente financeiro: enquanto a chave for Sandbox, mantenha `ASAAS_API_URL=https://api-sandbox.asaas.com/v3`.

As chaves ficam no `backend/.env` local e nas variáveis protegidas do servidor. Elas não são incluídas no ZIP de deploy. Publicar o ZIP não configura automaticamente os segredos na hospedagem. Após configurar o backend remoto e verificar a autenticação do endpoint, habilite o webhook no painel Asaas.

1. Crie uma conta separada de testes em https://sandbox.asaas.com e gere sua chave de API. Não utilize a chave antiga encontrada no projeto sem identificar sua origem. Não cole segredos em chats nem no Git.
2. No ambiente do backend configure `ASAAS_API_KEY`, `ASAAS_API_URL=https://api-sandbox.asaas.com/v3` e um `ASAAS_WEBHOOK_TOKEN` aleatório e secreto. Reinicie o backend. Sem chave e token, o checkout informa que os pagamentos estão indisponíveis.
3. Publique o backend de staging em HTTPS. Configure um webhook no Asaas para `https://DOMINIO-DO-STAGING/api/asaas/webhook`, usando o mesmo token no campo Auth Token. Localhost não recebe notificações externas. Não exponha o ambiente de produção para testes.
4. Use entrega sequencial e habilite eventos de cobrança: PAYMENT_CREATED, PAYMENT_UPDATED, PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_DELETED, PAYMENT_REFUNDED, PAYMENT_PARTIALLY_REFUNDED, PAYMENT_CREDIT_CARD_CAPTURE_REFUSED, PAYMENT_REPROVED_BY_RISK_ANALYSIS, PAYMENT_CHARGEBACK_REQUESTED, PAYMENT_CHARGEBACK_DISPUTE e PAYMENT_AWAITING_CHARGEBACK_REVERSAL. A aplicação consulta a cobrança real pela API em cada evento e valida assinatura, cliente e valor.
5. Para cartão, configure corretamente o proxy: `TRUST_PROXY_HOPS` deve refletir exatamente os proxies confiáveis da hospedagem. O IP enviado ao Asaas vem de `req.ip`, não do corpo enviado pelo navegador.

## Homologação antes de vender

- Entre como administrador de uma clínica de testes, abra `/checkout`, preencha nome, e-mail, documento, CEP, número e telefone fictícios aceitos pelo Sandbox.
- Pix: gere a cobrança, copie o código, recarregue a tela e confirme que a mesma cobrança é recuperada. Simule o recebimento no painel Sandbox. Confira o webhook e a liberação automática do plano.
- Cartão: use os dados fictícios documentados pelo Asaas; nunca um cartão real no Sandbox. Valide aprovação, recusa e análise pendente. A criação da assinatura não equivale à confirmação do pagamento.
- Reentregue uma notificação e valide que a validade não muda. CONFIRMED e RECEIVED da mesma cobrança não compram dois meses.
- Teste renovação com outra cobrança; atraso antigo não deve revogar uma mensalidade nova já paga. Teste estorno e cobrança cancelada. Estornos parciais mantêm o acesso enquanto o Asaas mantiver o pagamento confirmado.
- Confira `/assinatura` após recarregar e teste uma conta com avaliação expirada: ela deve continuar acessando checkout e status de cobrança.
- Faça uma tentativa com usuário sem perfil administrador e com token de webhook incorreto: ambos devem ser rejeitados.

## Recuperação e cancelamento

O botão “Recuperar cobrança” reaproveita a assinatura e o Pix existentes. Trocar de opção no formulário não cria outra assinatura quando já existe uma. Se a cobrança existente for de cartão, aguarde a confirmação; para trocar um cartão recusado ou a forma de pagamento de uma assinatura existente, use o atendimento e o painel Asaas antes de tentar novamente. O cancelamento das próximas mensalidades é realizado pelo atendimento no painel Asaas, preservando o período já pago. Ainda não há cancelamento automático na interface.

Após timeout de criação, a aplicação bloqueia novas tentativas para evitar cobrança duplicada. O atendimento deve consultar a assinatura no Asaas por cliente e referência `vetcare:clinic:ID`. Se ela existir, concilie `asaas_customer_id` e `asaas_subscription_id` da clínica e libere `billing_checkouts.state='ready'`. Se a ausência estiver confirmada pelo provedor, libere o estado para nova tentativa. Nunca limpe um bloqueio sem conferir o provedor. Nenhum número ou código de segurança de cartão é armazenado no banco.

Assinaturas canceladas não são recriadas automaticamente. Cancelamentos e pagamentos feitos em outra conta Asaas exigem conciliação antes da troca de ambiente. IDs Sandbox e Produção não são intercambiáveis: use bases de staging e produção separadas.

## Produção

Somente após a homologação completa: configure a chave da sua conta de produção, `ASAAS_API_URL=https://api.asaas.com/v3`, token e URL de webhook de produção. Reinicie o backend e verifique os eventos. Configure HTTPS, banco PostgreSQL e proxy antes de receber cartões reais. O endpoint legado de simulação de pagamentos retorna HTTP 410 e não libera acesso.

Referências oficiais: [Sandbox](https://docs.asaas.com/docs/sandbox), [assinatura com cartão](https://docs.asaas.com/reference/criar-assinatura-com-cartao-de-credito), [webhooks](https://docs.asaas.com/reference/criar-novo-webhook), [QR Code Pix](https://docs.asaas.com/reference/obter-qr-code-para-pagamentos-via-pix).


## Transição desta instalação para produção

A primeira versão de pagamentos desta instalação foi utilizada exclusivamente no Sandbox. Por isso, ao adicionar o controle de ambiente, os vínculos e pagamentos legados recebem `sandbox`. Não reutilize essa regra para importar uma base externa que já tenha pagamentos reais sem uma migração específica.

1. Faça backup do banco de produção pela ferramenta do provedor antes da atualização.
2. Publique o pacote com a migração de ambientes enquanto as variáveis ainda apontam para o Sandbox.
3. Copie do arquivo local protegido `backend/.env` os valores atuais de `ASAAS_API_KEY`, `ASAAS_API_URL` e `ASAAS_WEBHOOK_TOKEN` para as variáveis da aplicação na hospedagem. A URL de produção é `https://api.asaas.com/v3`. Preserve as demais variáveis e reinicie o backend.
4. Na primeira inicialização válida em produção, a migração transacional arquiva os vínculos Sandbox em `billing_environment_archive`, remove somente os IDs do provedor da clínica e encerra acessos pagos por simulação. Contas vitalícias, avaliações gratuitas válidas e todos os dados clínicos são preservados. As cobranças antigas ficam armazenadas com ambiente Sandbox e não entram no cálculo do acesso real. A migração é idempotente.
5. Verifique o endpoint de webhook com e sem o novo token; somente o token de produção deve autenticar. Confirme a nova versão em execução antes de habilitar o webhook de produção no Asaas.
6. Desative o webhook Sandbox que aponta para o domínio oficial. Mantenha os ambientes em bancos separados nos testes futuros. Para voltar ao Sandbox, restaure a configuração e os vínculos arquivados de forma controlada; não apenas troque a URL de API.

O token do webhook de produção é diferente do token Sandbox e fica somente no arquivo protegido e no Asaas. Não está incluído no ZIP. A criação e a habilitação de webhooks não criam cobranças. Nenhum pagamento real deve ser realizado automaticamente como parte da implantação.

Após publicar, o diagnóstico público `GET /api/asaas/configuration` deve informar `billingVersion: 2`, `environment: "production"` e `configured: true`. Esse diagnóstico não expõe chaves ou dados de clientes; ele confirma a versão implantada e a correspondência básica da configuração, não substitui a validação de credenciais pela API Asaas.


## Estado verificado em 28/10/2026

O domínio oficial foi verificado com `billingVersion: 2`, `configured: true` e `environment: production`. O endpoint rejeitou chamadas sem token com HTTP 401 e aceitou o token de produção com HTTP 200. A conta Asaas retornou aprovação geral e dados bancários aprovados. O webhook de produção foi ativado, com fila sequencial sem interrupção, e o webhook Sandbox que apontava para o mesmo domínio foi desativado.

O usuário confirmou a liberação de assinatura após Pix e cartão aprovados no Sandbox. A configuração e a ativação de webhooks não criaram cobranças reais. A confirmação ponta a ponta de uma transação real permanece pendente da primeira compra autorizada. Credenciais e evidências privadas ficam fora do Git e do pacote de implantação.
