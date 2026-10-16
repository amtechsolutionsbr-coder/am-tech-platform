# Entrega técnica — AM Tech Platform 0.2.0

Base preservada: commit `79c934e`. Data de validação: 16/10/2026.

## Implementado e verificado
- Dependências com versões fixas e lockfiles; instalação reproduzível com npm ci e pipeline atualizado.
- Testes sem abrir servidores em paralelo; correção de teste de tamanho UTF-8 e parser que preserva acentos/emoji entre pacotes.
- Validação de objeto JSON, identidade UUID e expiração obrigatória do JWT.
- Gestão de acessos existentes exclusiva do owner, proteção do último proprietário, auditoria e nova checagem sob bloqueio transacional.
- Consulta de perfil a cada requisição; admin cadastra, viewer/support consultam sem escrever.
- Assinaturas rejeitam cobrança anterior à data inicial.
- Prontidão do banco separada da saúde HTTP, timeouts de conexão/requisição, encerramento SIGTERM e logs sem detalhes privados.
- Limpeza de dados da interface ao trocar identidade; proteção contra respostas atrasadas da sessão anterior e login com estado de processamento.
- Papel técnico SQL privado, sem bypass de RLS, sem DELETE e sem permissão de reescrever auditoria; políticas exclusivas do backend aplicadas no Supabase AM Tech.
- Documentação de instalação, operação, implantação, acesso e manutenção revisada.

## Evidências
39 testes automatizados aprovados na execução local, incluindo SQL PostgreSQL embarcado, cadastro/consulta dos cinco módulos, permissões, JWT e rollback de auditoria. Build React/Vite aprovado com configuração pública real do Supabase. Instalação com npm ci validada. Auditorias npm: zero vulnerabilidades na API de produção e na árvore do frontend no momento da execução.

No Supabase real foram verificados: projeto ativo, sete tabelas, RLS, chave pública ES256 de assinatura, existência/permissões do papel técnico e ausência de identidades e vínculos administrativos. Nenhum cliente ou usuário fictício foi criado no ambiente real. O teste de negócios usa somente banco local descartável.

## Critério de liberação comercial
A existência de um deploy não prova homologação autenticada. É necessário criar a primeira identidade legítima e validar o primeiro login e o fluxo comercial real, conforme PRIMEIRO-ADMIN.md e TESTES.md. Até essa verificação, esta é uma entrega técnica para homologação, sem declaração de liberação comercial.

O serviço foi publicado no Render e o pipeline do GitHub foi aprovado. A checagem de prontidão detectou a ausência da CA oficial do Supabase na trust store do Node; a correção mantém a verificação de certificado e hostname habilitada. A validação final da conexão será registrada após o novo deploy.
