const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const cors = require('cors');
const compression = require('compression');
const outputDir = path.join(__dirname, 'output');

app.use(cors());
app.use(compression());
app.use(express.json());


app.post('/upload-history', (req, res) => {
    
    const history = req.body;
    // Limiar de corte para alerts: ?limiar=N na URL, ou 3 por padrão
    const pedido = Number(req.query.limiar);
    const limiar = Number.isInteger(pedido) && pedido >= 1 ? pedido : 3;

    // Gerando o history.json
    const historyJson = history;

    // Gerando o alerts.json
    let idAlert = 1;
    const alerts = [];
    history.forEach((frame) => {
        if (frame.personCount >= limiar) {
            alerts.push({
                idFrame: frame.idFrame,
                idAlert: idAlert++,
                count: frame.personCount,
                ...(frame.tempo !== undefined && { tempo: frame.tempo })
            });
        }
    });

    // Garantindo que a pasta output existe
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    // Salvando os arquivos
    fs.writeFileSync(path.join(outputDir, 'history.json'), JSON.stringify(historyJson, null, 2));
    fs.writeFileSync(path.join(outputDir, 'alerts.json'), JSON.stringify(alerts, null, 2));

    res.json({ status: 'ok' });
});

// The API and output formats stay unchanged. Serve the Vite build in production.
const frontendDir = path.join(__dirname, '..', 'dist');
app.use(express.static(frontendDir));

const porta = process.env.PORT || 3000;
app.listen(porta, () => console.log(`Backend rodando na porta ${porta}`));
