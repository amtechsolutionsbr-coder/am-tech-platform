# Integração de chamados dos aplicativos

Backend preparado e testado em ambiente isolado. Ainda não implantado nem conectado ao Adega Pro.

## Identidade e autorização
O aplicativo obtém uma sessão legítima do Supabase Auth empresarial e envia Bearer access_token. Não embutir senha, token administrativo ou chave service_role no executável. O UUID real deve estar vinculado ao aplicativo em client_app_users, após conferência administrativa de identidade, cliente e aplicativo. O vínculo não concede acesso ao painel administrativo; pode ser desativado. Não foram criados usuários ou vínculos de cliente em produção.

## Contrato
- POST /api/customer-support?app_id=UUID: request_id (UUID persistido no aplicativo), title, description, priority (low/normal/high/urgent). Cliente e aplicativo são derivados da autorização, não de IDs do corpo. Reenvios com o mesmo request_id e app_id retornam o protocolo existente.
- GET /api/customer-support?app_id=UUID&page=1: lista paginada dos chamados externos do aplicativo autorizado.
- GET /api/customer-support/PROTOCOLO/updates?app_id=UUID: somente notas visibility=customer, sem identidade interna do atendente.
- 401: sessão ausente/inválida; 403: sem vínculo ativo; 404: chamado fora do escopo ou inexistente; 422: dados inválidos.

No painel, notas são internas por padrão. O atendente deve escolher Resposta visível ao cliente para compartilhar uma resposta. Notas históricas anteriores permanecem internas. O aplicativo cliente ainda não pode acrescentar mensagens a um chamado existente; acompanha a abertura e as respostas da equipe.

## Adega offline
A aplicação precisa persistir a fila de chamados e o request_id no banco local, enviar quando houver internet e consultar respostas. Essa fila, a tela do cliente, autenticação do Adega Pro e homologação ponta a ponta ainda não estão implementadas neste repositório. Não transmitir vendas, caixa ou estoque para esta integração: apenas o chamado e sua descrição explícita.

## Implantação
Aplicar db/011_external_support.sql, revogar privilégios de anon/authenticated em client_app_users e publicar API e frontend juntos. Incluir a nova tabela na cópia empresarial. A criação de vínculo de cliente exige identidade legítima verificada; este documento não autoriza cadastros fictícios.

59 testes locais aprovados: JWT obrigatório, isolamento, bloqueio administrativo, visibilidade, reenvio idempotente, papel SQL restrito e revogação. React/Vite compilado. A conexão real com um aplicativo cliente continua pendente.
