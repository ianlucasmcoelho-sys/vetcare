# Pacote de implantação VetCare

Pacote atual: `VetCare-Hostinger-Staging-20261028-completo-atual.zip`.

Contém o código-fonte e o build do frontend. Não inclui dependências instaladas, credenciais, banco SQLite local, uploads de usuários, logs ou backups. As variáveis devem ser configuradas separadamente no servidor; `backend/.env.example` contém somente exemplos.

Inclui o Início com avisos, Dashboard clínico, cadastro encadeado de tutor e animal, ações rápidas do paciente e agenda completa. O módulo de banho e tosa foi removido, preservando os dados históricos.

O checkout Asaas oferece Pix e cartão, recuperação da mesma cobrança, confirmação segura por webhook, renovação e tratamento de recusa, estorno e chargeback. Não há liberação por links simulados. Contratações e recuperação de cobranças exigem administrador ativo. Cancelamento e troca da forma de pagamento de assinaturas existentes continuam pelo atendimento no Asaas.

A transição de Sandbox para produção arquiva os vínculos de teste e exclui mensalidades fictícias do cálculo do acesso real. Tutores, animais, prontuários, avaliações válidas e acessos vitalícios são preservados. Faça backup do banco hospedado antes de atualizar. Instruções e recuperação: `docs/pagamentos-asaas.md`.

Validação: 37 testes aprovados e build de produção concluído. Pix e cartão aprovados no Sandbox foram confirmados pelo usuário. Em 28/10/2026, o domínio https://vetcaresistema.com respondeu com billingVersion 2, configured true e environment production. O webhook de produção foi ativado e o webhook Sandbox do domínio foi desativado. Nenhuma cobrança real foi criada automaticamente durante a configuração; a primeira transação real ainda precisa ser validada.

O diagnóstico público `/api/asaas/configuration` identifica versão e ambiente sem expor segredos ou dados de clientes. Webhook público: https://vetcaresistema.com/api/asaas/webhook. E-mail de alertas: equipevetcare@vetcaresistema.com.
