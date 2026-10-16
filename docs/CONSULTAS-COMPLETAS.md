# Consultas da operação

Clientes, produtos, planos, assinaturas, orçamentos, aplicativos e chamados agora usam API paginada, com page/page_size e total; page_size máximo 200. Ordenação com desempate por ID. A interface percorre as páginas automaticamente para manter listas e seletores completos, sem truncar nos antigos limites 100/200.

Para bases muito grandes, o carregamento integral no navegador pode consumir memória; filtros e paginação visuais específicas desses cadastros ainda são uma evolução futura. O financeiro mantém sua própria paginação visual e exportação integral filtrada.

58 testes locais aprovados e React/Vite compilado, incluindo registros antigos, parâmetros inválidos, restrição de perfil, carregamento de múltiplas páginas e erro HTTP posterior. Sem alteração de esquema ou dados de produção.

O utilitário de backup foi integrado ao repositório. Execução real e agendamento ainda dependem de configuração privada apropriada, conforme BACKUP-RECUPERACAO.md. Não confundir exportação CSV com backup recuperável.
