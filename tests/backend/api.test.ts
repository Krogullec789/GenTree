import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Ustaw testową bazę przed zaimportowaniem aplikacji
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDbPath = path.join(__dirname, 'test-db.json');
process.env.TEST_DB = testDbPath;
process.env.NODE_ENV = 'test';
process.env.TREE_API_TOKEN = 'test-token';

const { default: app } = await import('../../server');

const auth = (req: request.Test) => req.set('Authorization', 'Bearer test-token');

const validTree = {
  nodes: {
    '1': {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      maidenName: '',
      birthDate: '',
      deathDate: '',
      bio: '',
      gender: 'male',
      avatar: '',
      x: 0,
      y: 0,
    },
  },
  edges: {},
};

describe('Backend API Tests', () => {
  beforeAll(() => {
    fs.writeFileSync(testDbPath, JSON.stringify({ nodes: {}, edges: {} }, null, 2));
  });

  afterAll(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('GET /api/tree should return empty tree initially', async () => {
    const res = await auth(request(app).get('/api/tree'));
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('nodes');
    expect(res.body).toHaveProperty('version');
    expect(Object.keys(res.body.nodes)).toHaveLength(0);
  });

  it('rejects requests without an API token when auth is configured', async () => {
    const res = await request(app).get('/api/tree');

    expect(res.statusCode).toEqual(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('POST /api/tree should save data', async () => {
    const current = await auth(request(app).get('/api/tree'));
    
    const res = await auth(request(app)
      .post('/api/tree'))
      .set('If-Match', current.body.version)
      .send(validTree);
      
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ success: true, version: expect.any(String) });
    
    const dbContent = JSON.parse(fs.readFileSync(testDbPath, 'utf8'));
    expect(Object.keys(dbContent.data.nodes)).toHaveLength(1);
    expect(dbContent.data.nodes['1'].firstName).toBe('John');
  });

  it('POST /api/tree should reject malformed tree data', async () => {
    const current = await auth(request(app).get('/api/tree'));
    const res = await auth(request(app)
      .post('/api/tree'))
      .set('If-Match', current.body.version)
      .send({ nodes: null, edges: {} });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toEqual('Invalid data structure');
  });

  it('POST /api/tree should reject people without required genealogical fields', async () => {
    const current = await auth(request(app).get('/api/tree'));
    const res = await auth(request(app)
      .post('/api/tree'))
      .set('If-Match', current.body.version)
      .send({
        nodes: { '1': { id: '1', firstName: 'John', x: 0, y: 0 } },
        edges: {},
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.details).toEqual(expect.arrayContaining(['Node 1 must have gender male or female.']));
  });

  it('POST /api/tree should reject stale versions', async () => {
    const current = await auth(request(app).get('/api/tree'));

    const first = await auth(request(app)
      .post('/api/tree'))
      .set('If-Match', current.body.version)
      .send(validTree);

    expect(first.statusCode).toEqual(200);

    const stale = await auth(request(app)
      .post('/api/tree'))
      .set('If-Match', current.body.version)
      .send(validTree);

    expect(stale.statusCode).toEqual(409);
    expect(stale.body).toEqual({
      error: 'Version conflict',
      version: first.body.version,
    });
  });

  it('POST /api/tree should handle concurrent saves', async () => {
    const current = await auth(request(app).get('/api/tree'));
    const requests = Array.from({ length: 5 }, (_, index) => {
      const id = `node-${index}`;
      return auth(request(app)
        .post('/api/tree'))
        .set('If-Match', current.body.version)
        .send({
          nodes: { [id]: {
            id,
            firstName: `Person ${index}`,
            lastName: 'Example',
            maidenName: '',
            birthDate: '',
            deathDate: '',
            bio: '',
            gender: 'male',
            avatar: '',
            x: index * 10,
            y: 0,
          } },
          edges: {},
        });
    });

    const responses = await Promise.all(requests);

    expect(responses.filter(res => res.statusCode === 200)).toHaveLength(1);
    expect(responses.filter(res => res.statusCode === 409)).toHaveLength(4);
  });
});
