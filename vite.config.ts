import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/** Dev only: serves api/suggest-safety.ts from `npm run dev`, reading GROQ_* from .env.local. Vercel runs it in production. */
function apiDev(): Plugin {
  return {
    name: 'api-dev',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv('development', process.cwd(), 'GROQ_');
      for (const k of ['GROQ_API_KEY', 'GROQ_MODEL']) if (env[k]) process.env[k] = env[k];
      server.middlewares.use('/api/suggest-safety', async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const mod = await server.ssrLoadModule('/api/suggest-safety.ts');
        const out: Response =
          req.method === 'POST'
            ? await mod.POST(new Request('http://localhost/api/suggest-safety', { method: 'POST', body: Buffer.concat(chunks) }))
            : new Response(JSON.stringify({ error: 'Use POST.' }), { status: 405 });
        res.statusCode = out.status;
        res.setHeader('content-type', 'application/json');
        res.end(await out.text());
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiDev()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
});
