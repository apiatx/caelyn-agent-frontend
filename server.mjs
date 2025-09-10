import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 5000);
const host = '0.0.0.0';

// Serve the built assets from /dist (Vite default)
const dist = path.join(__dirname, 'dist');
app.use(express.static(dist));

// Health endpoint for Preview checks
app.get(['/','/deployment-health'], (_req,res) => {
  try { res.sendFile(path.join(dist,'index.html')); }
  catch { res.type('text').send('ok'); }
});

app.listen(port, host, () => console.log('listening', host, port));
