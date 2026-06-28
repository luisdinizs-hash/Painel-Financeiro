exports.handler = async function (event) {
  const target = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!target) {
    return response(500, { success: false, message: 'Variável GOOGLE_APPS_SCRIPT_URL não configurada.' });
  }

  try {
    const isGet = event.httpMethod === 'GET';
    const upstream = await fetch(isGet ? `${target}?t=${Date.now()}` : target, {
      method: isGet ? 'GET' : 'POST',
      headers: isGet ? {} : { 'Content-Type': 'text/plain;charset=utf-8' },
      body: isGet ? undefined : event.body,
      redirect: 'follow'
    });
    const text = await upstream.text();
    try {
      JSON.parse(text);
    } catch (error) {
      return response(502, { success: false, message: 'O Google Apps Script retornou HTML. Confira a URL /exec e a permissão Qualquer pessoa.' });
    }
    return {
      statusCode: upstream.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      body: text
    };
  } catch (error) {
    return response(502, { success: false, message: 'Não foi possível acessar a planilha.' });
  }
};

function response(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(data)
  };
}
