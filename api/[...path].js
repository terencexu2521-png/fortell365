const WORKER_BASE = 'https://fortell365-api.terencexu2521.workers.dev';

export default async function handler(req, res) {
  const segments = req.query.path;
  const subpath = Array.isArray(segments) ? segments.join('/') : (segments || '');
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const target = `${WORKER_BASE}/${subpath}${qs}`;

  const headers = {};
  const contentType = req.headers['content-type'];
  if (contentType) headers['Content-Type'] = contentType;
  if (req.headers.authorization) headers.Authorization = req.headers.authorization;

  const init = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  try {
    const upstream = await fetch(target, init);
    const body = await upstream.text();
    res.status(upstream.status);
    const upstreamType = upstream.headers.get('content-type');
    if (upstreamType) res.setHeader('Content-Type', upstreamType);
    res.send(body);
  } catch (err) {
    res.status(502).json({ error: 'API 代理失败: ' + err.message });
  }
}
