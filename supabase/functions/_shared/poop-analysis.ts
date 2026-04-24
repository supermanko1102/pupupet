import Anthropic from 'npm:@anthropic-ai/sdk@0.27.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;

const MODEL = 'claude-opus-4-5';
const FAILURE_SUMMARY = '分析失敗，請重新拍照。';

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
type RiskLevel = 'normal' | 'observe' | 'vet';
type PoopColor = 'brown' | 'yellow' | 'black' | 'red' | 'green' | 'other';
type Consistency = 'hard' | 'normal' | 'soft' | 'liquid';

type ImagePayload = {
  base64: string;
  mediaType: ImageMediaType;
};

type Analysis = {
  bristolScore: number | null;
  color: PoopColor | null;
  confidence: number | null;
  consistency: Consistency | null;
  raw: Record<string, unknown>;
  recommendation: string;
  riskLevel: RiskLevel;
  summary: string;
};

const IMAGE_MEDIA_TYPES = new Set<ImageMediaType>([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const COLORS = new Set<PoopColor>(['brown', 'yellow', 'black', 'red', 'green', 'other']);
const CONSISTENCIES = new Set<Consistency>(['hard', 'normal', 'soft', 'liquid']);
const RISK_LEVELS = new Set<RiskLevel>(['normal', 'observe', 'vet']);

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function processOneJob(): Promise<{ success: boolean; id?: string; skipped?: boolean }> {
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  const { data: jobs, error: claimError } = await adminClient.rpc('claim_poop_job');

  if (claimError) throw new Error(`claim_poop_job failed: ${claimError.message}`);

  if (!jobs || jobs.length === 0) {
    return { success: true, skipped: true };
  }

  const { job_id: id, job_image_path: imagePath } = jobs[0] as {
    job_id: string;
    job_image_path: string | null;
  };

  try {
    if (!imagePath) {
      throw new Error(`job ${id} has no image_path`);
    }

    const image = await fetchImageForAnalysis(imagePath, adminClient);
    const analysis = await analyzeWithClaude(image);

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

    return { success: true, id };
  } catch (error) {
    const message = toErrorMessage(error);
    console.error(`job ${id} failed:`, error);
    await markJobFailed(id, message).catch(() => {});
    throw error;
  }
}

async function fetchImageForAnalysis(
  imagePath: string,
  adminClient: ReturnType<typeof createClient>
): Promise<ImagePayload> {
  const { data, error } = await adminClient.storage
    .from('poop-photos')
    .download(imagePath);

  if (error || !data) {
    throw new Error(`fetchImage failed: ${error?.message ?? 'no data'}`);
  }

  const mediaType = normalizeImageMediaType(data.type, imagePath);
  const buffer = await data.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return {
    base64: btoa(binary),
    mediaType,
  };
}

async function analyzeWithClaude(image: ImagePayload): Promise<Analysis> {
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
              media_type: image.mediaType,
              data: image.base64,
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

  const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
  return validateAnalysis(parseJsonObject(text));
}

function parseJsonObject(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  try {
    const parsed = JSON.parse(cleaned);
    if (isRecord(parsed)) return parsed;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      if (isRecord(parsed)) return parsed;
    }
  }

  throw new Error('Claude response was not a JSON object');
}

function validateAnalysis(raw: Record<string, unknown>): Analysis {
  return {
    bristolScore: nullableInteger(raw.bristolScore, 'bristolScore', 1, 7),
    color: nullableEnum(raw.color, 'color', COLORS),
    confidence: nullableNumber(raw.confidence, 'confidence', 0, 1),
    consistency: nullableEnum(raw.consistency, 'consistency', CONSISTENCIES),
    raw,
    recommendation: requiredText(raw.recommendation, 'recommendation', 120),
    riskLevel: requiredEnum(raw.riskLevel, 'riskLevel', RISK_LEVELS),
    summary: requiredText(raw.summary, 'summary', 80),
  };
}

function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid analysis.${field}: expected string`);
  }

  const text = value.trim();
  if (!text) {
    throw new Error(`Invalid analysis.${field}: expected non-empty string`);
  }

  return text.slice(0, maxLength);
}

function requiredEnum<T extends string>(value: unknown, field: string, allowed: Set<T>): T {
  if (typeof value === 'string' && allowed.has(value as T)) {
    return value as T;
  }

  throw new Error(`Invalid analysis.${field}: ${String(value)}`);
}

function nullableEnum<T extends string>(value: unknown, field: string, allowed: Set<T>): T | null {
  if (value === null || value === undefined) return null;
  return requiredEnum(value, field, allowed);
}

function nullableInteger(
  value: unknown,
  field: string,
  min: number,
  max: number
): number | null {
  if (value === null || value === undefined || value === '') return null;

  const numeric = typeof value === 'string' ? Number(value) : value;
  if (Number.isInteger(numeric) && typeof numeric === 'number' && numeric >= min && numeric <= max) {
    return numeric;
  }

  throw new Error(`Invalid analysis.${field}: ${String(value)}`);
}

function nullableNumber(value: unknown, field: string, min: number, max: number): number | null {
  if (value === null || value === undefined || value === '') return null;

  const numeric = typeof value === 'string' ? Number(value) : value;
  if (typeof numeric === 'number' && Number.isFinite(numeric) && numeric >= min && numeric <= max) {
    return numeric;
  }

  throw new Error(`Invalid analysis.${field}: ${String(value)}`);
}

function normalizeImageMediaType(blobType: string, imagePath: string): ImageMediaType {
  const normalized = blobType.split(';')[0]?.trim().toLowerCase();
  if (isImageMediaType(normalized)) return normalized;

  const extension = imagePath.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      throw new Error(`Unsupported image media type: ${blobType || extension || 'unknown'}`);
  }
}

function isImageMediaType(value: string | undefined): value is ImageMediaType {
  return IMAGE_MEDIA_TYPES.has(value as ImageMediaType);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function markJobFailed(id: string, error: string) {
  await updateLog(id, {
    status: 'failed',
    summary: FAILURE_SUMMARY,
    recommendation: null,
    model_version: MODEL,
    ai_raw_json: {
      error,
      failed_at: new Date().toISOString(),
      model_version: MODEL,
    },
  });
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
