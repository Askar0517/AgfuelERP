import app from './app.ts';
import { CONFIG } from './config/index.ts';
import { initDbAndSyncTables } from './db/index.ts';

const PORT = CONFIG.PORT;

export { app };
export default app;

// Listen when started directly as a standalone service
const normalizedScriptPath = (process.argv[1] || '').replace(/\\/g, '/');
if (
  !process.env.EMBEDDED_DEV &&
  (normalizedScriptPath.includes('backend/src/server') ||
    normalizedScriptPath.includes('backend/dist/server') ||
    normalizedScriptPath.endsWith('server.ts') ||
    normalizedScriptPath.endsWith('server.js'))
) {
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[PetroPulse Backend] Active on http://0.0.0.0:${PORT}`);
    try {
      await initDbAndSyncTables();
    } catch (err: any) {
      console.error('[DB Startup Error]:', err.message);
    }
  });
}
