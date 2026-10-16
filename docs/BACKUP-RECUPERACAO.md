# Backup e recuperação da operação

O executável pessoal continua conectado ao banco hospedado. Copiar o instalador não copia os dados.

## Implementação complementar
`node scripts/business-backup.mjs export caminho/backup.amtech` exporta as 14 tabelas empresariais em uma transação consistente e criptografa o arquivo com AES-256-GCM e chave derivada por scrypt. Não substitui arquivo existente. Configure AM_TECH_BACKUP_DATABASE_URL e AM_TECH_BACKUP_PASSWORD no ambiente privado; a senha precisa de 16 caracteres ou mais. Não colocar senha ou conexão no GitHub. A conexão de backup deve ter SELECT em todas as tabelas, incluindo auditoria; a conexão restrita da API não tem essa permissão e não foi ampliada.

`node scripts/business-backup.mjs verify-local caminho/backup.amtech` restaura somente em destino localhost, banco test_* ou restore_*, com esquema previamente criado e todas as tabelas vazias. O teste bloqueia o destino, insere em transação, preserva IDs e histórico e reposiciona a sequência da auditoria. Não existe comando de restauração de produção neste utilitário.

## Validação
55 testes aprovados, incluindo criptografia, rejeição de senha incorreta, restauração do esquema empresarial real em PostgreSQL embarcado isolado, conferência de registros e sequência e rejeição de destino com dados.

Ainda NÃO foi criado backup dos dados reais nem configurado agendamento. O conector atual não lista backups gerenciados e não fornece conexão SQL apropriada para executar o utilitário. Nenhuma credencial foi solicitada em chat ou exposta.

## O que não está incluído
Supabase Auth (identidades, senhas e sessões), objetos do Storage, permissões de infraestrutura, segredos, RLS/esquema (versionados no repositório). A cópia empresarial é complementar e não é recuperação completa do projeto. Guardar a senha separada; sem ela o arquivo não é recuperável. Armazenar cópias em destino privado fora do servidor, com retenção e testes periódicos.

## Fechamento pendente
Verificar no painel Supabase Database > Backups a disponibilidade real do plano; configurar backup gerenciado ou rotina privada de exportação; guardar uma cópia real e testar restauração em ambiente separado, sem substituir produção. Referência oficial: https://supabase.com/docs/guides/platform/backups . Backups gerenciados não incluem os próprios arquivos do Storage.
