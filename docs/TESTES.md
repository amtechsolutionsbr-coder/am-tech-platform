# Plano de testes — AM Tech Platform

## Testes locais
Usar Node.js 22+, em um terminal na raiz do repositório:

```bash
npm install
npm test
npm run build
```

A compilação usa Vite na pasta `web`. As variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` precisam ser configuradas para testar o login. O build por si só não comprova a autenticação.

## Cenários obrigatórios antes de produção
1. `GET /health` responde 200.
2. Sem `DATABASE_URL`, endpoints privados respondem 503.
3. Com banco configurado, sem token, endpoints privados respondem 401.
4. Token Supabase inválido ou expirado responde 401.
5. Token válido sem associação ativa em `admin_users` responde 403.
6. Proprietário cadastra cliente, produto, plano e assinatura; cada criação gera auditoria.
7. Viewer pode consultar, mas não cadastrar (403).
8. Produto inativo e cliente inativo não podem receber novos planos/assinaturas.
9. Preços e dados inválidos retornam 422 sem gravar dados.
10. Atualização da página e encerramento da sessão não vazam informações.

Os testes automatizados existentes cobrem apenas saúde e comportamento sem banco. **Os testes com autenticação e PostgreSQL real ainda não foram executados.**
