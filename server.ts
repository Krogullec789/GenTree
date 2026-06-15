import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateTreeData } from './src/utils/treeData';
import { TreeRepository } from './src/server/treeRepository';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DB_FILE = process.env.TEST_DB || path.join(__dirname, 'db.json');
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
const API_TOKEN = process.env.TREE_API_TOKEN || process.env.API_TOKEN || '';
const ALLOW_UNAUTHENTICATED_API =
  process.env.ALLOW_UNAUTHENTICATED_API === 'true' || process.env.NODE_ENV === 'test';
const repository = new TreeRepository(DB_FILE);

// Restrict CORS to known origin
app.use(cors({ origin: ALLOWED_ORIGIN }));

// Limit payload size to 2MB to prevent abuse
app.use(express.json({ limit: '2mb' }));

await repository.ensureInitialized();

const stripWeakQuotes = (value: string) => value.replace(/^W\//, '').replace(/^"|"$/g, '');

app.use('/api', (req, res, next) => {
  if (!API_TOKEN && !ALLOW_UNAUTHENTICATED_API) {
    return res.status(503).json({ error: 'API token is required' });
  }

  if (!API_TOKEN) return next();

  const bearer = req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  const headerToken = req.header('X-API-Token');

  if (bearer === API_TOKEN || headerToken === API_TOKEN) return next();

  return res.status(401).json({ error: 'Unauthorized' });
});

app.get('/api/tree', async (req, res) => {
  try {
    const data = await repository.read();
    res.setHeader('ETag', `"${data.version}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to read valid tree data' });
  }
});

app.post('/api/tree', async (req, res) => {
  try {
    const expectedVersionHeader = req.header('If-Match');

    if (!expectedVersionHeader) {
      const current = await repository.read();
      return res.status(428).json({ error: 'If-Match header is required', version: current.version });
    }

    const validation = validateTreeData(req.body);

    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid data structure', details: validation.errors });
    }

    const saved = await repository.save(validation.data, stripWeakQuotes(expectedVersionHeader));

    res.setHeader('ETag', `"${saved.version}"`);
    res.json({ success: true, version: saved.version });
  } catch (error) {
    const saveError = error as Error & { statusCode?: number; version?: string };
    if (saveError.statusCode === 409) {
      return res.status(409).json({ error: 'Version conflict', version: saveError.version });
    }

    console.error(error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});


if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

export default app;
