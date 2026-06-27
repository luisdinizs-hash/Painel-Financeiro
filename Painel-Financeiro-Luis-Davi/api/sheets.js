module.exports = async function handler(request, response) {
  const target = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!target) return response.status(500).json({ success: false, message: 'Variável GOOGLE_APPS_SCRIPT_URL não configurada.' });

  try {
    const isGet = request.method === 'GET';
    const upstream = await fetch(isGet ? `${target}?t=${Date.now()}` : target, {
      method: isGet ? 'GET' : 'POST',
      headers: isGet ? {} : { 'Content-Type': 'text/plain;charset=utf-8' },
      body: isGet ? undefined : (typeof request.body === 'string' ? request.body : JSON.stringify(request.body)),
      redirect: 'follow'
    });
    const text = await upstream.text();
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    return response.status(upstream.status).send(text);
  } catch (error) {
    return response.status(502).json({ success: false, message: 'Não foi possível acessar a planilha.' });
  }
};
