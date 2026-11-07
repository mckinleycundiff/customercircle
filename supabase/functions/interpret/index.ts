import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

function serviceKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!raw) throw new Error('No server key');
  const parsed = JSON.parse(raw);
  return parsed.default || Object.values(parsed)[0];
}

function outputText(data: { output_text?: string; output?: { content?: { text?: string }[] }[] }) {
  if (data.output_text) return data.output_text;
  const chunks: string[] = [];
  for (const item of data.output || []) {
    for (const part of item.content || []) if (part.text) chunks.push(part.text);
  }
  return chunks.join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const header = req.headers.get('Authorization') || '';
    const jwt = header.replace(/^Bearer\s+/i, '');
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey());
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData.user) return json({ message: 'Sign in first.' }, 401);
    const user = userData.user;
    const day = new Date().toISOString().slice(0, 10);
    const { data: row } = await admin.from('grok_usage').select('calls').eq('user_id', user.id).eq('day', day).maybeSingle();
    const calls = row?.calls || 0;
    if (calls >= 15) return json({ message: 'Grok limit reached for today. Send one command at a time.' }, 429);
    await admin.from('grok_usage').upsert({ user_id: user.id, day, calls: calls + 1 });

    const body = await req.json();
    const text = String(body.text || '').slice(0, 1000);
    const names = Array.isArray(body.customers) ? body.customers.map((n: unknown) => String(n)).slice(0, 200) : [];
    const instructions = [
      'Turn the note into CustomerCircle actions. Reply with JSON only, no markdown.',
      'Shape: {"actions":[{"kind":"add-customer","name":"","how_met":""}|{"kind":"log-activity","name":"","type":"Call|Text|Email|Meeting|Purchase|Sample|Follow-up|Note","notes":""}|{"kind":"reminder","name":"","when":"friday","action":""}|{"kind":"open-contact","name":""}]}',
      'Use add-customer only for a person who is not in the customer list. Log, reminder, and open-contact must use a name from the list.',
      'Do not invent a person. If you cannot tell, return {"actions":[]}.',
      'Customers: ' + names.join(', '),
      'Note: ' + text,
    ].join('\n');

    const payload = { model: 'grok-4.7', input: instructions, reasoning: { effort: 'low' } };
    let res = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + Deno.env.get('XAI_API_KEY'), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 400) {
      delete (payload as { reasoning?: unknown }).reasoning;
      res = await fetch('https://api.x.ai/v1/responses', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + Deno.env.get('XAI_API_KEY'), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    if (!res.ok) return json({ message: 'Grok could not read that. Try one command at a time.' }, 502);
    const data = await res.json();
    const raw = outputText(data).trim().replace(/^```json\s*|```$/g, '');
    const parsed = JSON.parse(raw);
    return json({ actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 6) : [] });
  } catch (_err) {
    return json({ message: 'Grok could not read that. Try one command at a time.' }, 500);
  }
});
