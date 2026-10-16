# Central de aplicativos e identidade AM Tech

Primeira etapa implementada em código, sem publicação em produção.

- Catálogo de aplicativos vinculado a clientes reais, com nome, URL HTTPS e etapa manual.
- Acesso exclusivo owner/admin e auditoria transacional.
- URLs sem credenciais, query string ou fragmento; abertura em nova aba sem compartilhar sessão.
- Nenhuma consulta automática à infraestrutura do cliente; sem monitoramento ou integração interna nesta etapa.
- Interface tecnológica escura, acentos ciano e créditos AM Tech Solutions na entrada e no rodapé autenticado.
- Padrão para próximos aplicativos: créditos persistentes da AM Tech, identidade adaptável ao cliente, dados separados e acesso interno condicionado a permissões explícitas.

Aplicar db/004_client_apps.sql após as migrações anteriores e publicar frontend e API juntos. Não criar clientes fictícios em produção. Validar login real, cadastro legítimo e navegação em desktop/celular antes de homologar. Ainda faltam edição, filtros, monitoramento autenticado, visão operacional interna e suporte.

O executável Windows permanece previsto para depois da homologação integral; a estrutura atual exige internet.
