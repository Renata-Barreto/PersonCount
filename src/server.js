const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const cors = require('cors');
const outputDir = path.join(__dirname, 'output');

app.use(cors());
app.use(express.json());


app.post('/upload-history', (req, res) => {
    
    const history = req.body;
    const limiar = 3; // Defina o limiar de corte para alerts

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
                count: frame.personCount
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

app.listen(3000, () => console.log('Backend rodando na porta 3000'));
