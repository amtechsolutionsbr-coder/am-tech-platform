# AM Tech Platform

Plataforma administrativa da AM Tech Solutions: clientes, produtos, planos, assinaturas e orçamentos sob medida. React/Vite, API Node.js e PostgreSQL/Supabase com login Supabase Auth.

## Instalação local
Requer Node.js 22+ e projeto Supabase empresarial configurado.

```sh
npm ci --ignore-scripts
npm --prefix web ci
```

Copie `.env.example` para `.env` e `web/.env.example` para `web/.env`. Preencha somente por canais privados as configurações do servidor; a interface recebe exclusivamente URL e chave pública publishable do Supabase. Aplique o esquema e as permissões descritas em docs/IMPLANTACAO.md em ambiente novo; não reaplique tabelas nem substitua dados de um banco existente.

```sh
npm test
npm --prefix web run build
node --env-file=.env src/server.js
```

Abra http://localhost:3000. Em produção, o Render injeta as variáveis e inicia `npm start`.

## Perfis
Owner gerencia acessos existentes e cadastros; admin gerencia cadastros; viewer e support somente consultam. Vínculos inativos são recusados. A interface não permite cadastrar o primeiro proprietário: use uma identidade real conforme a documentação.

## Documentação
- [Implantação e configuração](docs/IMPLANTACAO.md)
- [Primeiro administrador](docs/PRIMEIRO-ADMIN.md)
- [Operação e manutenção](docs/OPERACAO.md)
- [Testes e homologação](docs/TESTES.md)
- [Desktop e celular](docs/INSTALACAO.md)
- [Relatório de entrega](docs/ENTREGA.md)

Limites atuais: cadastros e consultas de até 100 registros por módulo; assinaturas pendentes sem cobrança automática; suporte, edição comercial, paginação, pagamentos, modo offline e instalador Windows homologado ainda não fazem parte desta versão. Consulte o relatório de entrega para distinguir verificações executadas de pendências reais.
