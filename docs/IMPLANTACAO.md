# Implantação segura — AM Tech Platform

## Situação
O banco empresarial Supabase foi criado na região sa-east-1 e recebeu a migração inicial. O painel React e a API Node.js estão no mesmo repositório. **A aplicação ainda não foi publicada ou testada em produção.**

## Antes de publicar
1. Criar usuário administrativo no Supabase Auth e inserir seu UUID em `admin_users` com `role='owner'`. Nunca usar e-mail como prova de privilégio.
2. Obter a URL do projeto Supabase e a chave **publishable** para o frontend. Nunca colocar `service_role` no frontend.
3. Criar usuário PostgreSQL dedicado com permissões mínimas para o backend, em vez de usar credenciais administrativas.
4. Revisar TLS da conexão PostgreSQL, o método de assinatura JWT do projeto e a compatibilidade com JWKS.
5. Executar testes automatizados e de autorização com tokens válidos/inválidos.
6. Validar proteção contra abuso (rate limit), backups, logs e trilha de auditoria antes de clientes reais.

## Configuração Render (quando validado)
- Serviço web Node.js no workspace empresarial.
- Build: `npm install && npm run build`
- Start: `npm start`
- Health check: `/health`
- Variáveis no ambiente do Render: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_AUDIENCE`.
- Variáveis públicas do build React: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Preferir chave publishable compatível; nenhuma chave privada no navegador.
- A API e o painel devem usar o mesmo domínio. Não é necessário definir `VITE_API_URL`.

**Não habilitar deploy público antes de concluir os testes de autenticação e de autorização.**

## Pendências
- A criação de clientes está disponível na API; edição, desativação e paginação ainda faltam.
- Produtos, planos e assinaturas ainda não possuem endpoints nem telas funcionais.
- O indicador de clientes usa apenas os 100 primeiros registros, não o total do banco.
