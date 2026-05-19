import './env';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ?? '3001';

// 1. Environment Configuration
const env = process.env.CALC_ENVIRONMENT ?? 'local';

app.use(cors());
app.use(express.json());

// 2. Supabase Health Check (FR-005)
const checkSupabase = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Missing Supabase environment variables');
    return false;
  }
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.auth.getSession();
    return !error;
  } catch (e: unknown) {
    console.error('Supabase health check failed:', e);
    return false;
  }
};

app.get('/api/health', async (_req, res) => {
  const isUp = await checkSupabase();
  if (isUp) {
    res.status(200).json({ status: 'OK', database: 'connected' });
  } else {
    res.status(503).json({ status: 'Service Unavailable', database: 'disconnected' });
  }
});

// 3. Dynamic Route Loading
const loadRoutes = async () => {
  const apiDir = path.resolve(__dirname, '..');
  const files = fs.readdirSync(apiDir);

  for (const file of files) {
    // Only mount root-level .ts files that are not server.ts or in subdirectories
    const filePath = path.join(apiDir, file);
    if (file.endsWith('.ts') && !fs.lstatSync(filePath).isDirectory()) {
      const routeName = file.replace('.ts', '');
      
      try {
        // Use relative path for import to ensure proper module caching
        const handlerModule = await import(`../${file}`) as { default: unknown };
        const handler = handlerModule.default;
        
        if (typeof handler === 'function') {
          app.all(`/api/${routeName}`, async (req, res) => {
            try {
              // Express req/res are compatible enough for our polyfilled handler
              // withErrorHandling middleware in the handlers will handle status/json
              await (handler as (req: express.Request, res: express.Response) => Promise<void>)(req, res);
            } catch (err) {
              console.error(`Error handling route /api/${routeName}:`, err);
              if (!res.headersSent) {
                res.status(500).json({ error: 'Internal Server Error' });
              }
            }
          });
          console.log(`Mounted route: /api/${routeName}`);
        }
      } catch (err) {
        console.error(`Failed to load route ${file}:`, err);
      }
    }
  }
};

const start = async () => {
  await loadRoutes();
  app.listen(port, () => {
    console.log(`Local API server running on http://localhost:${port}`);
    console.log(`Environment: ${env}`);
  });
};

start().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
