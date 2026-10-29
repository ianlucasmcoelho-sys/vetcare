# Relatório de QA — VetCare — 28/10/2026

## Resultado e escopo

Varredura funcional, visual e de permissões em ambiente local isolado, com clínicas e pacientes fictícios. Foram percorridas as páginas públicas e os módulos do sistema em Chromium, em desktop e em quadros com largura de 390 px. Foram corrigidas as falhas reproduzidas descritas abaixo.

Validação: **44 testes automatizados aprovados**, build de produção concluído e **82 verificações HTTP locais** de leitura, criação, atualização, exclusão, assinatura, anexos e autorização aprovadas após os retestes. HTTP 200 com confirmação e HTTP 204 foram considerados respostas válidas para exclusão, conforme o contrato de cada rota. Os primeiros testes também ajudaram a distinguir caminhos inexistentes de problemas reais da aplicação.

Não houve publicação nesta varredura. Nenhuma cobrança real foi criada, nem registros de clientes do site público foram alterados. O domínio público respondeu HTTP 200 no health check e informou integração Asaas configurada em produção; isso não valida uma transação financeira completa.

## Falhas corrigidas

A auditoria das dependências de produção na raiz, backend e frontend não reportou vulnerabilidades conhecidas nesta execução. Isso não substitui uma avaliação de segurança completa da aplicação e da infraestrutura.

| Prioridade | Problema reproduzido ou identificado no código | Correção e verificação |
| --- | --- | --- |
| Alta | JWT continuava válido após desativação/exclusão; perfil antigo podia manter privilégios | Cada requisição e a verificação de sessão consultam usuário ativo e perfil atual na mesma clínica. Testes com mudança de perfil, desativação, exclusão e outra clínica. |
| Alta | Restrições de escrita dependiam dos botões da interface | Guardas na API para configurações, modelos, prontuários, consultas, receitas, tutores, financeiro e estoque, seguindo as permissões existentes da interface. Verificações diretas com recepção e veterinário. |
| Alta | Pacientes homônimos podiam compartilhar registros na lista de prontuários | Associação pelo ID; registros legados sem ID exigem nome do paciente e tutor. Seleção do paciente mostra tutor e ID. Teste de regressão para homônimos. |
| Alta | Upload enviava FormData com Content-Type JSON; miniaturas privadas eram requisitadas sem autenticação | Cabeçalho multipart definido pelo navegador, miniaturas carregadas com autorização e URL temporária. Upload pela interface e download pela API confirmados; acesso de outra clínica e token inválido recusados. |
| Alta | Botão de PDF do centro de documentos lançava `doc.autoTable is not a function` | Uso da API compatível da biblioteca. Download de termo, prontuário e relatório confirmado no navegador. |
| Média | Datas clínicas apareciam com um dia a menos no Brasil | Utilitário de data sem conversão indevida para UTC, aplicado a prontuários, exames, internação, vacinação, receitas e demais datas exibidas. Data de formulários usa o dia local. Testes em quatro fusos. |
| Média | Campos vazios exibiam `null` na linha do tempo e `undefined` em documentos | Mensagens de ausência de informação em vez de valores técnicos. |
| Média | Recepcionista/veterinário não conseguia salvar o próprio nome | Perfil pessoal usa a rota própria, sem depender da edição administrativa de usuários. Salvamento pela interface de recepção confirmado. E-mail de acesso é editado pelo administrador. |
| Média | Edição de usuário podia perder a situação ativo/inativo e sugeria uma troca de senha que não era salva | Situação preservada; campo de senha removido da edição administrativa; impedida autodesativação/rebaixamento e validado e-mail duplicado. |
| Média | Criação de clínica incompleta podia falhar no banco; nome cadastrado não inicializava as configurações | Validação no servidor, normalização de e-mail e criação transacional de clínica, administrador e configurações. Nome da clínica confirmado via API após cadastro. |
| Média | Profissionais só eram carregados por uma rota exclusiva de administrador | Prontuário, financeiro e comissões usam a lista de profissionais ativos da clínica, sem abrir a gestão de usuários. |
| Média | Saída de estoque insuficiente retornava erro interno; quantidades fracionadas eram truncadas | Erro de negócio HTTP 400, produto inexistente HTTP 404 e quantidades inteiras positivas. Saldo insuficiente e frações retestados. |
| Média | Modelo incompleto gerava HTTP 500; importação não tinha limite de tamanho | Validação de nome, tipo e HTML, importação HTML limitada a 1 MB, limpeza de temporários e verificação da clínica ao editar. |
| Média | Início ocupava meia coluna no celular; perfil animal ultrapassava a largura; prontuários sem estilos de cartão | Correções de especificidade da grade, cartões, espaçamento, abas e alinhamento dos cabeçalhos. Reteste sem excesso de largura no início, perfil animal e prontuários. |
| Média | Planos usava 100vw, gerando rolagem horizontal; status de pagamento tinha links sem padrão visual | Largura fluida, navegação móvel quebrada em linhas e cartão de status com ações no padrão VetCare. |
| Média | Tema escolhido não era restaurado na área interna e o controle estava ausente | Área autenticada restaura o tema e oferece alternância claro/escuro; conferido visualmente. |
| Baixa | Marca pequena na recuperação de senha, nome genérico da clínica no topo e botão Excel sem estilo | Ícone VetCare legível, identificação correta da clínica e estilo de exportação. Valores de relatório em moeda brasileira. |
| Baixa | Abortos normais de navegação apareciam como erros no console | AbortError deixa de ser registrado como falha da requisição. |
| Manutenção | CI usava Node 20, divergindo do runtime declarado, e não executava regressões | CI atualizado para Node 22 e execução dos testes de backend/frontend. Anexos e arquivos auxiliares SQLite ignorados pelo Git. |

## Cobertura por tela

“Navegação/layout” significa abertura e inspeção de conteúdo, largura e apresentação. “Fluxo” especifica o que foi efetivamente exercitado; não significa teste de todas as combinações possíveis de campos.

| Tela ou grupo | Cobertura |
| --- | --- |
| Landing, login e cadastro | Navegação/layout desktop e celular, login por e-mail, criação e validação de clínica via API, tema e erros de formulário já cobertos pela regressão de autenticação. |
| Recuperação e redefinição de senha | Layout e estado de link ausente/inválido; envio real de e-mail não validado nesta execução. |
| Início e dashboard clínico | Indicadores, avisos, ações rápidas, navegação, responsividade, temas e leitura das duas APIs de resumo. |
| Tutores e perfil do tutor | Criação pela interface e API, sugestão de novo animal, vínculo pré-selecionado, perfil, leitura e exclusão de registros fictícios. |
| Animais e perfil do animal | Cadastro por API e interface com idade aproximada, vínculo ao tutor, abas, datas, ações rápidas, autorização, impressão e exclusão fictícia. |
| Agenda | Lista, modal com paciente pré-selecionado, calendário completo, reservas existentes, horários livres/ocupados e intervalo. Regressões automatizadas de conflito, expediente e concorrência. |
| Consultas e prontuários | Lista de pacientes, detalhes, ausência de dados, homônimos, cadastro/leitura/exclusão por API, prévia A4 e download de PDF. |
| Internação | Lista e detalhes, criação, alta e exclusão por API, layout móvel. Aplicação física de medicação não faz parte do teste. |
| Exames | Lista, solicitação, atualização de resultado e exclusão por API, apresentação das datas e layout. |
| Vacinas e retornos | Listas, filtros/avisos, datas e criação/exclusão por API, layout móvel. |
| Receituário | Lista, criação e exclusão por API, permissões e layout. |
| Documentos | Modelos, escolha de paciente, preenchimento e download de termo PDF. Conteúdo dos modelos não recebeu validação jurídica ou profissional nesta auditoria técnica. |
| Financeiro, estoque e preços | Listas, criação/exclusão, saída de estoque, insuficiência, rejeição de frações, permissões e tabelas móveis. |
| Orçamentos e comissões | Abertura/layout; criação/exclusão de orçamento e leitura de comissões/regras pela API. Não foi executado fechamento financeiro real. |
| Arquivos | Escolha do paciente, upload de imagem pela interface, miniatura autenticada, download, rejeição de conteúdo inválido, token inválido e isolamento entre clínicas. |
| Modelos de texto | Lista, criação/exclusão por API, rejeição de entrada incompleta, permissão administrativa e layout. |
| CRM e relatórios | Leitura das APIs, apresentação dos indicadores, filtros de período, PDF e Excel baixados, tabelas com rolagem interna no celular. |
| Equipe e configurações | Perfis, estado ativo/inativo, proteção da própria conta, identificação da clínica e restrições de escrita verificadas por API. |
| Meu perfil | Salvamento do nome com recepção pela interface, campos de segurança, rejeição de senha atual incorreta sem encerrar a sessão. |
| Planos, assinatura, checkout e status | Layout, retorno ao sistema, bloqueio de módulos pagos no trial, expiração retornando 402 e manutenção do acesso ao status de cobrança. Checkout local desabilitado por falta de credencial, como esperado. |
| Notas fiscais | Tela “Em breve” e retorno ao dashboard; API de emissão continua indisponível com HTTP 503. |
| Onboarding | Abertura e etapas da apresentação; resposta de erro agora impede que a conclusão seja gravada apenas no navegador. |

## Limites antes da liberação definitiva

- Validar entrega real de recuperação de senha e alertas pelo SMTP de produção.
- Validar o primeiro ciclo financeiro real autorizado: cobrança, confirmação do webhook, liberação e acompanhamento. Testes automatizados do gateway e confirmação pública de configuração não substituem essa validação.
- Validar persistência dos anexos após um novo deploy e restauração de backup no ambiente de hospedagem. Upload/download local não comprova persistência entre implantações.
- Login Google, navegadores Safari/Firefox, dispositivos físicos, acessibilidade completa e carga concorrente de produção não foram homologados nesta execução. Os testes concorrentes existentes cobrem especificamente reservas da agenda.
- Notas fiscais permanecem bloqueadas conforme a decisão do projeto. Não foram habilitadas nesta atualização.

## Evidências e entrega

Evidências locais em `logs/qa-publico-20261028/`: `testes.txt`, `build.txt`, `fluxos-api.json`, `reteste-api.json`, `anexos-api.json`, `planos-api.json`, `exclusoes-api.json`, `rotas.json`, `rotas-publicas.json`, `mobile-corrigido.png` e `desktop-inicio-corrigido.png`. A pasta contém dados fictícios e credenciais exclusivamente locais de teste; permanece fora do Git e do pacote.

Backup anterior às alterações: `backups/antes-atualizacao-2026-10-28-193006/`.

Pacote para implantação: `deployment/VetCare-Hostinger-Staging-20261028-completo-atual.zip`, sem credenciais, bancos, anexos de pacientes, dependências instaladas ou dados de QA. A publicação dessas correções ainda precisa ser feita.
