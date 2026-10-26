# Regras de atualização do projeto

Por solicitação do usuário, em toda atualização do código:

1. Antes de modificar ou atualizar o código (inclusive com git pull), criar uma cópia do estado local anterior em `backups/antes-atualizacao-AAAA-MM-DD-HHmmss/`.
2. Preservar nessa cópia os arquivos de código e as alterações locais ainda não commitadas. Não copiar `.git`, `node_modules` nem a própria pasta `backups` recursivamente. Manter dados sensíveis apenas localmente.
3. Somente prosseguir com a atualização após confirmar que o backup foi criado com sucesso. Não apagar backups anteriores sem solicitação do usuário.
4. Após concluir e verificar a atualização, atualizar o pacote de entrega na pasta `deployment`, seguindo o padrão `VetCare-Hostinger-Staging-AAAAMMDD-completo-atual.zip`. O pacote deve refletir o código atualizado e não incluir backups, credenciais ou dependências locais.
5. Informar ao usuário o caminho do backup e o caminho do pacote atualizado.

A pasta `backups/` deve permanecer ignorada pelo Git.
