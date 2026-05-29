# Projeto Sistema Ouro Pet - Diretrizes de Desenvolvimento

## Padrões de UI/UX e Estilização
- **Consistência Global:** Todas as novas telas e componentes devem seguir rigorosamente o padrão visual e de usabilidade já estabelecido no projeto (veja `Global.css` e páginas existentes como `Responsaveis.jsx`).
- **Análise Crítica:** Antes de aplicar mudanças de layout, avalie se elas prejudicam a responsividade ou a consistência. Proponha alternativas padronizadas se uma sugestão quebrar esses princípios.
- **Manutenção de Estilo:** Ao estilizar componentes, foque na manutenção do padrão global de cores, espaçamentos e tipografia.

## Padrões de Engenharia
- **Sincronia Schema-UI:** Sempre verifique se os campos presentes nas telas de criação/edição estão devidamente mapeados e presentes nas tabelas do banco de dados para evitar erros de execução.
- **Multi-tenant:** Todos os registros devem estar vinculados a um `clinica_id`.
