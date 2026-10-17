# Backup e recuperação da operação

O executável pessoal continua conectado ao banco hospedado. Copiar o instalador não copia os dados.

## Implementação complementar
`node scripts/business-backup.mjs export caminho/backup.amtech` exporta as 14 tabelas empresariais em uma transação consistente e criptografa o arquivo com AES-256-GCM e chave derivada por scrypt. Não substitui arquivo existente. Configure AM_TECH_BACKUP_DATABASE_URL e AM_TECH_BACKUP_PASSWORD no ambiente privado; a senha precisa de 16 caracteres ou mais. Não colocar senha ou conexão no GitHub. A conexão de backup deve ter SELECT em todas as tabelas, incluindo auditoria; a conexão restrita da API não tem essa permissão e não foi ampliada.

`node scripts/business-backup.mjs verify-local caminho/backup.amtech` restaura somente em destino localhost, banco test_* ou restore_*, com esquema previamente criado e todas as tabelas vazias. O teste bloqueia o destino, insere em transação, preserva IDs e histórico e reposiciona a sequência da auditoria. Não existe comando de restauração de produção neste utilitário.

## Conferência do arquivo sem banco
`node scripts/business-backup.mjs inspect caminho/backup.amtech` usa somente AM_TECH_BACKUP_PASSWORD e não conecta ao banco. Confere a autenticação criptográfica e o formato, mostrando a data registrada e as quantidades por tabela, sem listar clientes, acessos ou valores. Senha errada e arquivo adulterado são recusados.

Essa conferência não prova restauração nem inclui dados de Auth/Storage. Para verificar a recuperação, execute também `verify-local` em destino isolado vazio. Falhas de configuração ou conexão agora recebem mensagem genérica sem imprimir credenciais.

## Situação verificada em 16/10/2026
Projeto AM Tech ativo e saudável, 14 tabelas públicas, conexão da API sem leitura da auditoria e integração externa não aplicada. Essas verificações não demonstram existência de backup gerenciado.

## Validação
Testes automatizados aprovados, incluindo criptografia, rejeição de senha incorreta, restauração do esquema empresarial real em PostgreSQL embarcado isolado, conferência de registros e sequência e rejeição de destino com dados.

Ainda NÃO foi criado backup dos dados reais nem configurado agendamento. O conector atual não lista backups gerenciados e não fornece conexão SQL apropriada para executar o utilitário. Nenhuma credencial foi solicitada em chat ou exposta.

## O que não está incluído
Supabase Auth (identidades, senhas e sessões), objetos do Storage, permissões de infraestrutura, segredos, RLS/esquema (versionados no repositório). A cópia empresarial é complementar e não é recuperação completa do projeto. Guardar a senha separada; sem ela o arquivo não é recuperável. Armazenar cópias em destino privado fora do servidor, com retenção e testes periódicos.

## Fechamento pendente
Verificar no painel Supabase Database > Backups a disponibilidade real do plano; configurar backup gerenciado ou rotina privada de exportação; guardar uma cópia real e testar restauração em ambiente separado, sem substituir produção. Referência oficial: https://supabase.com/docs/guides/platform/backups . Backups gerenciados não incluem os próprios arquivos do Storage.

## Próxima ação no painel
Abra https://supabase.com/dashboard/project/xyzzkpdipdupgrywwhna/database/backups e confira a data e a situação do último backup disponível. Não acione restauração em produção. Se o painel não oferecer backup no plano atual, configure uma conexão privada dedicada para a exportação empresarial e um destino privado externo ao servidor. Conexão e senha devem ser fornecidas somente no ambiente privado de execução, nunca no chat ou repositório.

A instalação e o login Windows foram confirmados pelo proprietário; o visual e o logo oficial também foram aprovados. Isso não encerra a pendência de cópia real e teste de recuperação.

## Identidade dedicada de backup
Em 17/10/2026 UTC, foi criada a identidade SQL `amtech_backup`: SELECT nas 14 tabelas empresariais com políticas RLS específicas, sem INSERT/UPDATE/DELETE/TRUNCATE, sem criação no schema public, sem privilégios administrativos ou bypass de RLS. Nenhuma identidade pública ou da API recebe participação nesse papel. A conexão da API continua sem SELECT de auditoria.

O papel nasce NOLOGIN e sem senha. O proprietário deve definir senha forte e habilitar LOGIN diretamente no painel privado. Não há senha no código, na migração ou no chat. No Session pooler, o usuário passa a ser `amtech_backup.xyzzkpdipdupgrywwhna`, mantendo o host/porta apresentados no Connect. Só testar conexão/exportação após a configuração privada. Esta migração não cria o backup, não configura agendamento e não comprova autenticação por senha.
