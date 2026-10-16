# Fechamento da primeira versão web

## Implementado
Clientes, produtos, planos, assinaturas, orçamentos, controle de acessos, central de aplicativos, receitas/despesas, parcelas, pagamentos parciais, quitações, estornos, correções com motivo e histórico, resumo mensal, filtros/CSV limitado à listagem, suporte e créditos AM Tech.

## Evidências
50 testes locais aprovados; React/Vite compilado. Testes exercitam PostgreSQL isolado e o papel restrito. Não equivalem à homologação visual autenticada. Usuário confirmou funcionamento do acesso e da versão anterior; não confirmou individualmente todos os novos fluxos.

## Verificação autenticada pendente
Com dados legítimos, conferir cliente → produto/plano → orçamento → assinatura → lançamento financeiro → pagamento e histórico. Estorno e correção devem ser usados somente quando houver um erro real. Conferir chamado e sua resolução, edição de aplicativos, comportamento em celular e segunda identidade real com leitura. Não criar dados fictícios em produção nem compartilhar senhas.

## Limites conhecidos
- Cobranças e devoluções bancárias são externas; o financeiro registra movimentações manualmente.
- Listagens comerciais até 100 registros; financeiro, aplicativos e suporte até 200. CSV exporta a lista filtrada carregada, não toda a base. Sem paginação integral.
- Saldo de caixa não é lucro contábil; não há conciliação bancária ou emissão fiscal.
- Central abre aplicativos, sem visão de dados internos/monitoramento integrado.
- Backups ainda não automatizados pelo projeto; verificar recuperação antes de uso comercial.
- Proteção Supabase contra senhas vazadas está desativada e deve ser revisada conforme disponibilidade do plano.
- Executável Windows ainda não gerado/homologado; estrutura Electron atual depende de internet.

O aplicativo da adega começa após o fechamento desta plataforma. Este documento não declara conclusão de verificações pendentes.

## Retorno do usuário
Em 16/10/2026, o usuário confirmou que as telas consultadas funcionam no seu acesso. Confirmação de uso não equivale a execução independente de todos os casos, como segunda identidade de leitura, recuperação de backup e instalação Windows. Preparação de workflow Windows adicionada; geração e instalação ainda devem ser verificadas.
