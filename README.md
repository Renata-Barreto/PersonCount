# PersonCount

Detecção de pessoas em vídeos com **React, SCSS, TensorFlow.js e COCO-SSD** no navegador. Um backend Express salva o histórico e os alertas em JSON.

## Requisitos

- Node.js 22.12+ (ou Node.js 20.19+ compatível com Vite).
- Conexão com a internet para a primeira carga dos pesos do COCO-SSD, hospedados em `storage.googleapis.com`.

## Desenvolvimento

Na raiz do projeto:

```sh
npm install
npm run dev
```

Abra o endereço exibido pelo Vite (normalmente `http://127.0.0.1:5173`). O comando inicia o Vite e o Express na porta 3000. As chamadas a `/upload-history` passam pelo proxy do Vite; não é necessário Live Server nem abrir o HTML diretamente.

Os serviços também podem ser iniciados separadamente com `npm run dev:server` e `npm run dev:front`.

## Produção local

```sh
npm run build
npm start
```

Abra `http://localhost:3000`. O Express serve a pasta `dist`, gerada pelo Vite.

## Uso e resultados

1. Aguarde o status **Modelo pronto**.
2. Selecione um vídeo local e confira o nome exibido. Há um exemplo em `media/people-walking.mp4`.
3. Clique em **Processar vídeo**. A visualização destaca pessoas com caixas vermelhas e porcentagens de confiança.
4. Ao concluir a reprodução e o envio das contagens, consulte o gráfico.

O vídeo permanece no navegador, com reprodução sem áudio para análise. Somente o histórico de contagens é enviado ao backend. A análise acompanha a reprodução e **não garante processar todos os quadros codificados**: `idFrame` é o índice da amostra de inferência, começando em zero. Não há rastreamento de pessoas únicas nem exportação de vídeo processado.

## Organização

```text
front/
  index.html
  src/
    App.jsx                    # Composição da tela
    App.scss                   # Layout da aplicação
    components/                # Cada componente com JSX e SCSS próprios
      AppHeader/
      VideoUpload/
      ProcessingStatus/
      DetectionView/
      ResultsChart/
    hooks/                     # Estado e ciclo de vida do React
    services/                  # Modelo, processamento e comunicação HTTP
    utils/                     # Desenho das detecções e configuração do gráfico
    styles/                    # Variáveis Sass compartilhadas e estilos globais
    test/                      # Configuração de testes
src/
  server.js                    # API Express e arquivos estáticos de produção
  output/                      # Histórico e alertas existentes
media/                         # Arquivos de exemplo originais
vite.config.mjs                # React, Sass, proxy e testes
```

O frontend usa JavaScript/JSX e SCSS compilado pelo Vite. Os estilos dos componentes compartilham variáveis via `@use`; não há framework de CSS, roteador ou gerenciador global de estado. Modelo, vídeo, URLs temporárias e gráficos são liberados no encerramento de seus ciclos de vida, incluindo o replay de efeitos do React StrictMode.

## Verificação

```sh
npm test
npm run build
```

Os testes usam inferência simulada para verificar o contrato das contagens, ciclo de vida, erros e execuções repetidas sem baixar o modelo. A verificação manual com o vídeo de exemplo exige acesso aos pesos reais do COCO-SSD. As contagens reais variam com o dispositivo e a velocidade de inferência.

## Créditos

Renata Barreto de Castro Fernandes — [GitHub](https://github.com/Renata-Barreto).

Licença declarada pelo projeto original: MIT.
