import path from 'path';
import express from 'express';
import { app } from './backend/src/app.ts';
import { initDbAndSyncTables } from './backend/src/db/index.ts';

const PORT = Number(process.env.PORT) || 3000;
const DIST_DIR = path.resolve(process.cwd(), 'dist');

// Serve compiled static frontend assets
app.use(express.static(DIST_DIR));

// Handle client-side SPA routing fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(DIST_DIR, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      next();
    }
  });
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`[AG Fuels ERP Server] Running on http://0.0.0.0:${PORT}`);
  try {
    await initDbAndSyncTables();
  } catch (err: any) {
    console.warn('[DB Init Note]:', err.message);
  }
});

export default app;
