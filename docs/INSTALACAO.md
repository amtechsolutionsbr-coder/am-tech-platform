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
$env:AM_TECH_APP_URL = 'https://SEU-DOMINIO-OFICIAL'
npm run desktop:pack
```

O instalador NSIS será criado em `release/`, caso a compilação conclua sem erros. O script `scripts/prepare-desktop.mjs` incorpora somente a URL HTTPS pública ao pacote. O usuário final não precisa configurar variáveis de ambiente. Nunca inclua credenciais privadas nessa URL.

A assinatura digital do instalador, o teste no Windows e a distribuição ainda estão pendentes.
