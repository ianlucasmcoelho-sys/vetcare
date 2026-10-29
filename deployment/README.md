# Pacote de implantação VetCare

Pacote atual: `VetCare-Hostinger-Staging-20261029-completo-atual.zip`.

Atualização de layout de 29/10/2026: selo Tutor Ativo em espaço próprio, sem sobreposição ao nome; cards de animais com alturas uniformes, rodapé na base, quebra de textos longos e título completo ao passar o cursor. Build de produção concluído. Conferência visual local dos estilos com sete cards de dados fictícios em desktop (1280 px) e celular (375 px): alturas iguais, sem vazamento horizontal ou sobreposição do selo. Esta entrega não inclui o teste de pagamento de R$ 0,10. Publicação confirmada em 29/10/2026 no domínio vetcaresistema.com: HTML e quatro arquivos JS/CSS de tutores e animais idênticos ao build local, com HTTP 200; API saudável e banco conectado.

Atualização de QA de 28/10/2026: correções de sessão e permissões na API, isolamento de prontuários de animais homônimos, datas sem deslocamento de fuso, upload e miniaturas autenticadas, geração de PDF, perfil pessoal, validações de cadastro/estoque/modelos e ajustes de responsividade e tema. CI passa a executar regressões com Node 22. Relatório completo: `docs/relatorio-qa-20261028.md`.

Validação desta entrega: 44 testes automatizados aprovados, 82 verificações HTTP locais aprovadas após reteste, build de produção concluído e inspeção de telas em desktop e largura de celular. Auditoria de dependências de produção sem vulnerabilidades conhecidas reportadas. As validações anteriores abaixo são históricas. Esta entrega ainda precisa ser publicada; e-mail real, primeiro ciclo de cobrança real e persistência de anexos entre deploys continuam pendentes de homologação externa.

Contém o código-fonte e o build do frontend. Não inclui dependências instaladas, credenciais, banco SQLite local, uploads de usuários, logs ou backups. As variáveis devem ser configuradas separadamente no servidor; `backend/.env.example` contém somente exemplos.

Inclui o Início com avisos, Dashboard clínico, cadastro encadeado de tutor e animal, ações rápidas do paciente e agenda completa. O módulo de banho e tosa foi removido, preservando os dados históricos.

O checkout Asaas oferece Pix e cartão, recuperação da mesma cobrança, confirmação segura por webhook, renovação e tratamento de recusa, estorno e chargeback. Não há liberação por links simulados. Contratações e recuperação de cobranças exigem administrador ativo. Cancelamento e troca da forma de pagamento de assinaturas existentes continuam pelo atendimento no Asaas.

A transição de Sandbox para produção arquiva os vínculos de teste e exclui mensalidades fictícias do cálculo do acesso real. Tutores, animais, prontuários, avaliações válidas e acessos vitalícios são preservados. Faça backup do banco hospedado antes de atualizar. Instruções e recuperação: `docs/pagamentos-asaas.md`.

Validação: 37 testes aprovados e build de produção concluído. Pix e cartão aprovados no Sandbox foram confirmados pelo usuário. Em 28/10/2026, o domínio https://vetcaresistema.com respondeu com billingVersion 2, configured true e environment production. O webhook de produção foi ativado e o webhook Sandbox do domínio foi desativado. Nenhuma cobrança real foi criada automaticamente durante a configuração; a primeira transação real ainda precisa ser validada.

O diagnóstico público `/api/asaas/configuration` identifica versão e ambiente sem expor segredos ou dados de clientes. Webhook público: https://vetcaresistema.com/api/asaas/webhook. E-mail de alertas: equipevetcare@vetcaresistema.com.

Notas fiscais temporariamente indisponíveis: o menu abre uma tela de Em breve e as rotas fiscais autenticadas retornam HTTP 503 com FISCAL_MODULE_COMING_SOON. Nenhuma emissão, cancelamento ou alteração fiscal é permitida. Registros históricos preservados. A reativação depende da regularização e configuração fiscal; sem data definida.

Validação do bloqueio fiscal: 38 testes aprovados, build concluído, navegação conferida no navegador e HTTP 503 confirmado nas rotas fiscais locais. Esta atualização precisa ser publicada para aplicar o aviso e o bloqueio no domínio oficial.

A seção Design focado em performance da landing page usa uma captura atual do dashboard clínico com dados fictícios. A imagem dashboard-clinico-20261028.webp tem 1269 × 717 pixels e 57.006 bytes; substitui a referência ao JPG antigo de 103.495 bytes, preservando carregamento sob demanda e a proporção sem cortes.

Landing e acesso revisados: depoimentos, identidades fictícias, contadores de clientes e promessas não comprovadas de receita, economia de tempo, segurança absoluta ou uptime foram substituídos por recursos e etapas reais do produto. O print do dashboard é identificado como ilustrativo. O contato usa equipevetcare@vetcaresistema.com, sem telefone fictício.

Login e cadastro compartilham layout com identidade VetCare, colunas alinhadas, temas claro/escuro, rótulos, visibilidade de senha, estados de erro e adaptação ao celular. O cadastro informa 7 dias de teste e R$ 97/mês após o período, sem prometer gratuidade permanente. A intenção de contratar o plano completo é preservada entre login e cadastro. Os textos de onboarding também foram ajustados aos recursos disponíveis.

Validação mais recente: 39 testes aprovados e build de produção concluído. No navegador local com base de testes: login válido/inválido, mostrar senha, requisitos e confirmação de senha, cadastro de clínica fictícia, onboarding, logout e navegação do plano completo. Layout conferido em desktop e em largura de celular, inclusive no modo escuro. Essas alterações precisam ser publicadas no domínio oficial.
