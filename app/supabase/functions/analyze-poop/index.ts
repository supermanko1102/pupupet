import Anthropic from 'npm:@anthropic-ai/sdk@0.27.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;

const MODEL = 'claude-opus-4-5';

interface PoopLogRecord {
  id: string;
  pet_id: string;
  image_path: string;
  status: string;
}

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: PoopLogRecord;
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();

    if (payload.type !== 'INSERT' || payload.table !== 'poop_logs') {
      return new Response('skip', { status: 200 });
    }

    const { id, image_path } = payload.record;

    // 1. 把 status 改成 analyzing
    await updateLog(id, { status: 'analyzing' });

    // 2. 從 Storage 取得圖片（signed URL）
    const imageBase64 = await fetchImageAsBase64(image_path);

    // 3. 呼叫 Claude Vision API
    const analysis = await analyzeWithClaude(imageBase64);

    // 4. 把結果寫回 poop_logs
    await updateLog(id, {
      status: 'done',
      bristol_score: analysis.bristolScore,
      color: analysis.color,
      consistency: analysis.consistency,
      risk_level: analysis.riskLevel,
      summary: analysis.summary,
      recommendation: analysis.recommendation,
      confidence: analysis.confidence,
      model_version: MODEL,
      ai_raw_json: analysis.raw,
    });

    return new Response(JSON.stringify({ success: true, id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('analyze-poop error:', err);
    // 盡量把 status 改成 failed
    try {
      const payload: WebhookPayload = await new Response(req.body).json().catch(() => null);
      if (payload?.record?.id) {
        await updateLog(payload.record.id, { status: 'failed' });
      }
    } catch {}

    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function fetchImageAsBase64(imagePath: string): Promise<string> {
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await adminClient.storage
    .from('poop-photos')
    .download(imagePath);

  if (error || !data) {
    throw new Error(`fetchImage failed: ${error?.message ?? 'no data'}`);
  }

  const buffer = await data.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function analyzeWithClaude(imageBase64: string) {
  const client = new Anthropic({ apiKey: anthropicApiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `你是一位寵物健康助理。請分析這張寵物糞便照片，並以 JSON 格式回傳以下欄位：

{
  "bristolScore": <1-7 的整數，依據 Bristol Stool Scale，無法判斷填 null>,
  "color": <"brown" | "yellow" | "black" | "red" | "green" | "other">,
  "consistency": <"hard" | "normal" | "soft" | "liquid">,
  "riskLevel": <"normal" | "observe" | "vet">,
  "summary": <給飼主看的一句話中文摘要，20 字以內>,
  "recommendation": <給飼主的中文建議，50 字以內>,
  "confidence": <0.0-1.0 的小數，代表分析可信度>
}

riskLevel 判斷標準：
- normal：外觀正常，顏色棕色、形狀成形、軟硬適中，無任何異狀
- observe：有輕微異常但不需立即就醫，例如偏軟、顏色略深或略淺、形狀稍不規則
- vet：有明顯異常需就醫，例如血便、黑焦油便、鮮紅血絲、灰白色、嚴重水瀉、寄生蟲跡象

summary 撰寫規則：
- normal：簡短說明正常狀態，例如「糞便成形、顏色正常，狀況良好」
- observe：說明具體異常點，例如「糞便偏軟，建議觀察是否持續兩天以上」
- vet：點出需就醫的關鍵症狀，例如「發現血絲，建議盡快就醫」

recommendation 撰寫規則：
- normal：給一個維持健康的日常小建議
- observe：告訴飼主觀察什麼、觀察多久、什麼情況要升級就醫
- vet：強調就醫urgency，並建議就診前可以做的事（如保留樣本）

只回傳 JSON，不要加其他文字。`,
          },
        ],
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned);

  return {
    bristolScore: parsed.bristolScore ?? null,
    color: parsed.color ?? null,
    consistency: parsed.consistency ?? null,
    riskLevel: parsed.riskLevel ?? 'normal',
    summary: parsed.summary ?? '',
    recommendation: parsed.recommendation ?? '',
    confidence: parsed.confidence ?? null,
    raw: parsed,
  };
}

async function updateLog(id: string, fields: Record<string, unknown>) {
  const res = await fetch(`${supabaseUrl}/rest/v1/poop_logs?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
      apikey: supabaseServiceKey,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(fields),
  });

  if (!res.ok) {
    throw new Error(`updateLog failed: ${await res.text()}`);
  }
}
