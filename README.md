# PersonCount

Detecção de pessoas em vídeos com **React, SCSS e YOLOv8 (ONNX Runtime Web)** no navegador. Um backend Express salva o histórico e os alertas em JSON.

## Início rápido (Docker)

Requer Docker com o Compose. Na raiz do projeto:

```sh
docker compose up --build -d
```

Abra `http://localhost:3000`. Pelos scripts do npm: `npm run docker:up`, `npm run docker:down` e `npm run docker:logs`. Os arquivos `history.json` e `alerts.json` aparecem em `src/output/`.

## Requisitos (sem Docker)

- Node.js 22.12+ (ou Node.js 20.19+ compatível com Vite).
- O modelo `yolov8n.onnx` (~12 MB, COCO) fica em `front/public/models/` e é servido pelo próprio app; não precisa de internet para carregá-lo. Os pesos do YOLOv8 da Ultralytics usam licença AGPL-3.0; verifique se ela serve ao seu uso. O arquivo foi ajustado com `scripts/patch_yolo_resize.py`, que troca os dois nós `Resize` por uma `ConvTranspose` equivalente (resultado idêntico) para funcionar no WebGL.
- Aceleração por GPU: WebGPU quando disponível, senão WebGL (Firefox, por exemplo); sem nenhum dos dois, WebAssembly na CPU. O status da tela indica **GPU** ou **CPU**.
- A inferência roda em um Web Worker, então a página não trava durante a análise. O runtime (WASM) de cada backend é baixado só quando usado, e o servidor comprime as respostas.
- Em produção, um service worker (`front/public/sw.js`) guarda o modelo e os arquivos do runtime no cache do navegador: a primeira visita baixa tudo, as seguintes carregam direto do cache. **Ao trocar o arquivo do modelo, aumente a constante `CACHE` em `sw.js`.** O cache não é usado em `npm run dev`.

## Desenvolvimento

Na raiz do projeto:

```sh
npm install
npm run dev
```

Abra o endereço exibido pelo Vite (`http://127.0.0.1:5173`; se a porta estiver ocupada, o comando falha em vez de trocar de porta). O comando inicia o Vite e o Express na porta 3000. As chamadas a `/upload-history` passam pelo proxy do Vite.

Os serviços também podem ser iniciados separadamente com `npm run dev:server` e `npm run dev:front`.

## Produção local (sem Docker)

```sh
npm run build
npm start
```

Abra `http://localhost:3000` (ou defina `PORT`). O Express serve a pasta `dist`, gerada pelo Vite.

## Uso e resultados

1. Aguarde o status **Modelo pronto**.
2. Selecione um vídeo local e confira o nome exibido. Há um exemplo em `media/people-walking.mp4`.
3. Clique em **Processar vídeo**. A visualização destaca pessoas com caixas vermelhas e porcentagens de confiança.
4. Ao concluir a reprodução e o envio das contagens, consulte o gráfico.

O vídeo permanece no navegador, com reprodução sem áudio para análise. Somente o histórico de contagens é enviado ao backend. A análise acompanha a reprodução e **não garante processar todos os quadros codificados**: `idFrame` é o índice da amostra de inferência, começando em zero. Não há rastreamento de pessoas únicas nem exportação de vídeo processado.

### Ajustes na tela

- **Confiança mínima** (10–90%, padrão 40%): detecções abaixo disso são descartadas.
- **Limiar de alerta** (padrão 3): amostras com essa contagem ou mais entram em `alerts.json`. O valor viaja em `POST /upload-history?limiar=N`; o corpo continua sendo o mesmo array. Sem o parâmetro, o servidor usa 3. O gráfico mostra o limiar como linha tracejada.
- Os ajustes ficam bloqueados durante a análise.

### API do backend

- `POST /upload-history` recebe `[{ "idFrame": 0, "tempo": 0, "personCount": 2 }]` e retorna `{ "status": "ok" }`. `tempo` (segundos do vídeo) é opcional; `?limiar=N` define o limiar de alerta (inteiro ≥ 1, padrão 3).
- `src/output/history.json` contém o histórico recebido; `src/output/alerts.json` contém `{ idFrame, idAlert, count, tempo }` para as contagens maiores ou iguais ao limiar (`idAlert` começa em 1).
- Cada amostra envia o histórico acumulado completo, em ordem, e a interface aguarda a conclusão antes de liberar outra análise.
- Os mesmos dois arquivos são sobrescritos a cada análise. Use uma análise ativa por vez; não há armazenamento por usuário ou sessão.
- Se o backend estiver indisponível, a análise e o gráfico continuam, e a interface avisa que houve falha ao salvar.

## Organização

```text
front/
  index.html
  public/                      # Modelo ONNX, favicon e service worker (sw.js)
  src/
    App.jsx                    # Composição da tela
    App.scss                   # Layout da aplicação
    components/                # Cada componente com JSX e SCSS próprios
      AppHeader/
      VideoUpload/
      DetectionSettings/
      ProcessingStatus/
      DetectionView/
      ResultsChart/
    hooks/                     # Estado e ciclo de vida do React
    services/                  # Worker de inferência (YOLO), processamento e API HTTP
    utils/                     # Desenho das detecções e configuração do gráfico
    styles/                    # Variáveis Sass compartilhadas e estilos globais
    test/                      # Configuração de testes
src/
  server.js                    # API Express e arquivos estáticos de produção
  output/                      # Histórico e alertas existentes
media/                         # Arquivos de exemplo originais
vite.config.mjs                # React, Sass, proxy e testes
scripts/                       # Ajuste do modelo para WebGL
Dockerfile, docker-compose.yml # Execução em container
```

O frontend usa JavaScript/JSX e SCSS compilado pelo Vite. Os estilos dos componentes compartilham variáveis via `@use`; não há framework de CSS, roteador ou gerenciador global de estado. Modelo, vídeo, URLs temporárias e gráficos são liberados no encerramento de seus ciclos de vida, incluindo o replay de efeitos do React StrictMode.

## Verificação

```sh
npm test
npm run build
```

Os testes usam inferência simulada para verificar o contrato das contagens, ciclo de vida, erros e execuções repetidas sem baixar o modelo. A verificação manual com o vídeo de exemplo usa o modelo YOLOv8 real, executado na GPU (WebGPU/WebGL) ou, sem ela, em WebAssembly. As contagens reais variam com o dispositivo e a velocidade de inferência.

## Créditos

Renata Barreto de Castro Fernandes — [GitHub](https://github.com/Renata-Barreto).

Licença declarada pelo projeto original: MIT.
