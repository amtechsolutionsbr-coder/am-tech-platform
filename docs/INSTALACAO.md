# AM Tech Platform — Windows e celular

## Arquitetura de produção
O site React e a API Node devem estar publicados sob HTTPS. O banco PostgreSQL e as credenciais privadas ficam **somente no servidor**, nunca no instalador ou no navegador.

## Windows
O Electron em `desktop/main.cjs` é um invólucro da aplicação hospedada. Ele exige `AM_TECH_APP_URL` apontando para a URL HTTPS oficial. A criação de instalador `.exe` ainda depende da configuração de empacotamento, de uma URL de produção e de testes no Windows.

## Android e iPhone
O site tem manifesto PWA e layout responsivo. Após publicar em HTTPS, Android: Chrome > Instalar app ou Adicionar à tela inicial. iPhone: Safari > Compartilhar > Adicionar à Tela de Início. A experiência de instalação completa ainda exige verificar os ícones e os requisitos de cada navegador. O acesso offline não está implementado.

## Estado real
Arquitetura e telas preparadas no repositório. Não há aplicativo publicado, instalador `.exe` gerado ou testes em dispositivos reais.

## Gerar instalador Windows (ambiente Windows)

Pré-requisitos: Node.js 22+, conexão com npm e URL HTTPS da plataforma já publicada.

```powershell
npm install
npm run desktop:pack
```

O instalador NSIS será criado em `release/`, caso a compilação conclua sem erros. O aplicativo exige a variável `AM_TECH_APP_URL` configurada com a URL HTTPS oficial **no computador em que for executado**. Isso é uma limitação provisória: antes de distribuir o instalador, precisamos embutir a URL pública de forma segura, sem incluir segredos.

A assinatura digital do instalador, o teste no Windows e a distribuição ainda estão pendentes.
