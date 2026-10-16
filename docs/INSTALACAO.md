# AM Tech Platform — Windows e celular

## Windows (planejado)
A versão desktop usa Electron. A construção do instalador Windows deve ser executada e testada em Windows. A API Node é executada localmente pelo Electron; os dados empresariais permanecem no Supabase. O computador precisa de internet e configuração segura de conexão com a API. **Não incluir DATABASE_URL, service_role ou segredos PostgreSQL no pacote distribuído.** Para produção, o desktop deverá apontar para a API hospedada; o servidor local atual é apenas um protótipo técnico.

## Celular
O site inclui manifesto PWA. Depois de publicado em HTTPS, no Android use Chrome > Instalar app / Adicionar à tela inicial; no iPhone use Safari > Compartilhar > Adicionar à Tela de Início. O suporte offline não está implementado. Instalação pode depender de requisitos adicionais do navegador (ícones PNG, service worker e HTTPS).

## Estado
Manifesto PWA e estrutura Electron adicionados ao código. Não há instalador .exe nem aplicativo mobile publicado ou testado.
