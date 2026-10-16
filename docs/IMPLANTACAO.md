# Implantação — AM Tech Platform 0.2.0

Projeto exclusivo AM Tech no Supabase: `xyzzkpdipdupgrywwhna`. Workspace empresarial Render: `tea-db8ocfrl550s73ekg5b0`. Não usar recursos corporativos de terceiros.

## Ambiente novo
1. Execute `db/001_initial.sql` e `db/002_quotes.sql` no projeto empresarial.
2. Aplique `supabase/migrations/20261016031537_backend_role.sql` uma vez. O papel `amtech_api` começa sem login; gere um segredo forte em ambiente privado e habilite LOGIN com PASSWORD pelo canal administrativo seguro. Não use credencial postgres em produção.
3. A conexão deve usar o Session pooler fornecido em Connect no Supabase se a hospedagem usa IPv4. O usuário é `amtech_api.REFERENCIA_DO_PROJETO`; use o host real exibido pelo projeto, banco postgres, porta 5432 e TLS com certificado validado.
4. Crie um serviço web Node.js no Render com este repositório, branch main, build `npm ci --ignore-scripts && npm run build`, start `npm start`, Node 22. Use `/ready` como health check quando o banco estiver conectado.
5. Configure as variáveis abaixo no painel seguro. A aplicação não lê arquivos `.env` automaticamente; no desenvolvimento use `node --env-file=.env src/server.js`.

| Variável | Destino | Conteúdo |
|---|---|---|
| DATABASE_URL | Backend | Conexão privada do papel técnico |
| SUPABASE_URL | Backend | URL HTTPS do projeto empresarial |
| SUPABASE_JWT_AUDIENCE | Backend | authenticated (padrão) |
| VITE_SUPABASE_URL | Build React | Mesma URL pública |
| VITE_SUPABASE_ANON_KEY | Build React | Chave publishable pública; nome legado compatível |
| NODE_VERSION | Render | 22 |

Não inclua chave secreta ou `service_role` no frontend. Frontend e API são servidos no mesmo domínio; mantenha `VITE_API_URL` vazio. Alterar variáveis VITE exige recompilar o frontend.

## Validação
Execute os testes e o build antes do deploy. Após publicar, valide `/health`, `/ready`, tela de login e bloqueio 401 sem token. A publicação da tela de login não conclui a homologação autenticada: faça o procedimento PRIMEIRO-ADMIN.md e os cenários de TESTES.md antes do uso comercial.

O endpoint JWKS do projeto foi consultado e disponibiliza ES256, aceito pela API. As tabelas mantêm RLS; apenas o papel privado do backend possui políticas próprias. Não conceda esse papel às identidades da Data API.
