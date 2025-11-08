export default async function handler(req, res) {
  // Allow CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'BREVO_API_KEY não configurada no servidor' });
  }

  try {
    const body = req.body || {};
    // Espera: { email, attributes, listIds, updateEnabled }
    const brevoPayload = {
      email: body.email,
      attributes: body.attributes || {},
      listIds: Array.isArray(body.listIds) ? body.listIds : [5],
      updateEnabled: body.updateEnabled !== false
    };

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(brevoPayload)
    });

    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!response.ok) {
      return res.status(response.status).json({ message: json.message || 'Falha ao criar/atualizar contato', detail: json });
    }

    return res.status(200).json(json);
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno ao enviar para Brevo', error: String(err) });
  }
}