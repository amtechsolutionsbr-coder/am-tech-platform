# Validação — 0.2.0

Execute Node.js 22 ou superior:

```sh
npm ci --ignore-scripts
npm --prefix web ci
npm test
npm --prefix web run build
```

A suíte `node --test` usa PostgreSQL embarcado PGlite para executar o esquema real e as transações da API em memória. Identidades sintéticas existem apenas nesse banco descartável, nunca no Supabase empresarial. A verificação criptográfica usa chaves efêmeras exclusivas dos testes. Esses testes não equivalem ao primeiro login real.

Cobertura: saúde, prontidão, JSON inválido/grande, UTF-8 dividido entre pacotes, arquivos internos, contratos HTTP, datas reais, cálculo monetário, JWT válido/inválido/expirado/audiência/emissor, vínculos inativos, leitura e escrita dos cinco módulos, referências inativas, auditoria transacional, owner/admin/leitura, último proprietário e revogação.

## Homologação real que exige identidade legítima
1. Criar o primeiro usuário conforme PRIMEIRO-ADMIN.md e acessar a URL publicada.
2. Confirmar `/api/me` como owner e cadastrar dados comerciais legítimos nos cinco módulos.
3. Usar uma segunda identidade real para admin e leitura; confirmar ocultação de cadastro e rejeição HTTP 403 quando tentar escrever.
4. Desativar o vínculo secundário e confirmar bloqueio na próxima requisição.
5. Conferir os eventos no SQL Editor e testar em Windows e celular.

Não declarar essa homologação concluída apenas porque o processo compila, `/health` responde ou testes isolados passam.
