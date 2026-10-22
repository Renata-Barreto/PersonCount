Solução:

Este projeto tem como objetivo detectar pessoas em vídeos, processando cada frame para identificar quantas pessoas aparecem em cada momento. O resultado é salvo em dois arquivos JSON: 
    history.json: registra a contagem de pessoas em cada frame do vídeo.
    Alerts.json: registra apenas os frames em que a contagem de pessoas atinge ou ultrapassa um limiar definido (por padrão, 3 pessoas).
A solução é composta por um frontend web (HTML, CSS, JS) e um backend Node.js (Express), que se comunicam via HTTP.

Abordagens:

1. Frontend: Utiliza ONNX Runtime Web e o modelo YOLOv8 para detecção de pessoas em tempo real no navegador. O usuário seleciona um vídeo, que é processado frame a frame. Bounding boxes são desenhadas sobre as pessoas detectadas. A cada frame processado, a contagem de pessoas é enviada ao backend via fetch.

2. Backend: Implementado em Node.js com Express. Recebe os dados do frontend e salva dois arquivos JSON. O limiar de alerta pode ser facilmente ajustado no código.

Justificativas:

1. ONNX Runtime Web + YOLOv8:

    Permite rodar a detecção de pessoas diretamente no navegador, sem necessidade de instalar bibliotecas pesadas no backend ou depender de GPUs.

2. Comunicação via HTTP:
    Facilita a integração entre frontend e backend, tornando a solução modular e fácil de manter.

3. Arquivos JSON:
    São leves, fáceis de manipular e compatíveis com diversas ferramentas de análise.

Observações:

1. O projeto foi desenvolvido para ser adaptável: basta alterar o valor do limiar no backend para mudar a sensibilidade dos alertas.

2. O uso de CSP (Content Security Policy) foi configurado para garantir segurança e funcionamento correto dos recursos externos.

3. O sistema pode ser expandido para detectar outros objetos, basta ajustar o filtro no frontend.