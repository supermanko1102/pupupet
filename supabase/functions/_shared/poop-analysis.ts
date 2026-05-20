import Anthropic from 'npm:@anthropic-ai/sdk@0.27.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;

const MODEL = 'claude-opus-4-5';
const SYSTEM_FAILURE_SUMMARY = '暫時無法完成分析，請稍後再試。';

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
type PoopColor = 'brown' | 'yellow' | 'black' | 'red' | 'green' | 'other';
type Consistency = 'hard' | 'normal' | 'soft' | 'liquid';
type FailureReason = 'not_poop' | 'unclear' | 'system_error';

type ImagePayload = {
  base64: string;
  mediaType: ImageMediaType;
};

type Analysis = {
  aiEscalationSigns: string[];
  aiFindings: string[];
  aiNextStep: string | null;
  aiObservation: string | null;
  aiPossibleReasons: string[];
  aiWatchItems: string[];
  bristolScore: number | null;
  color: PoopColor | null;
  confidence: number | null;
  consistency: Consistency | null;
  failureReason: FailureReason | null;
  isAnalyzable: boolean;
  raw: Record<string, unknown>;
  recommendation: string;
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
const FAILURE_REASONS = new Set<FailureReason>(['not_poop', 'unclear', 'system_error']);

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

    if (!analysis.isAnalyzable) {
      await updateLog(id, {
        status: 'failed',
        ai_observation: null,
        ai_findings: [],
        ai_possible_reasons: [],
        ai_next_step: null,
        ai_watch_items: [],
        ai_escalation_signs: [],
        bristol_score: null,
        color: null,
        consistency: null,
        summary: analysis.summary,
        recommendation: analysis.recommendation,
        confidence: analysis.confidence,
        failure_reason: analysis.failureReason ?? 'unclear',
        model_version: MODEL,
        ai_raw_json: analysis.raw,
      });

      return { success: true, id };
    }

    await updateLog(id, {
      status: 'done',
      ai_observation: analysis.aiObservation,
      ai_findings: analysis.aiFindings,
      ai_possible_reasons: analysis.aiPossibleReasons,
      ai_next_step: analysis.aiNextStep,
      ai_watch_items: analysis.aiWatchItems,
      ai_escalation_signs: analysis.aiEscalationSigns,
      bristol_score: analysis.bristolScore,
      color: analysis.color,
      consistency: analysis.consistency,
      summary: analysis.summary,
      recommendation: analysis.recommendation,
      confidence: analysis.confidence,
      failure_reason: null,
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
            text: `你是一位寵物健康觀察助理。請先判斷照片是否適合做寵物糞便外觀觀察，再以 JSON 格式回傳以下欄位：

{
  "isAnalyzable": <boolean，照片中有清楚可判讀的寵物糞便時為 true，否則 false>,
  "failureReason": <null | "not_poop" | "unclear">,
  "bristolScore": <1-7 的整數，依據 Bristol Stool Scale，無法判斷填 null>,
  "color": <null | "brown" | "yellow" | "black" | "red" | "green" | "other">,
  "consistency": <null | "hard" | "normal" | "soft" | "liquid">,
  "aiObservation": <照片觀察，一句中文，60 字以內>,
  "aiFindings": <中文字串陣列，列出 1-4 個可見特徵>,
  "aiPossibleReasons": <中文字串陣列，列出 0-3 個非診斷性的可能背景或原因>,
  "aiNextStep": <給飼主的下一步中文建議，80 字以內>,
  "aiWatchItems": <中文字串陣列，列出 0-4 個接下來可留意的點>,
  "aiEscalationSigns": <中文字串陣列，列出 0-4 個未來若出現應聯絡獸醫的警訊>,
  "summary": <同 aiObservation，給舊版 fallback 使用>,
  "recommendation": <同 aiNextStep，給舊版 fallback 使用>,
  "confidence": <0.0-1.0 的小數，代表分析可信度>
}

可分析判斷：
- 如果照片看起來不是寵物糞便，isAnalyzable=false，failureReason="not_poop"
- 如果照片太暗、太模糊、太遠、糞便被遮擋或不完整到無法判讀，isAnalyzable=false，failureReason="unclear"
- isAnalyzable=false 時，bristolScore/color/consistency 都填 null，所有 ai* 陣列填 []，aiObservation/aiNextStep 可說明無法分析與重拍建議
- 只有照片中有清楚可判讀的寵物糞便時，isAnalyzable=true 並填外觀觀察欄位

語氣規則：
- 不要輸出 riskLevel、normal、observe、vet 或任何分級欄位
- 不要使用「診斷」「判定」「確診」「必須就醫」等診斷或命令語氣
- 使用「照片中看起來」「可見」「可能」「建議接下來留意」等觀察語氣
- 顏色或形狀和典型棕色成形糞便不同時，只描述你看到的外觀與可觀察方向，不要下醫療結論
- aiEscalationSigns 只描述未來若持續或合併出現時可聯絡獸醫的警訊，例如反覆血色、黑色焦油狀、持續水便、嘔吐、精神或食慾下降
- 如果疑似光線、陰影、相機白平衡或食物染色造成顏色偏差，請在 aiPossibleReasons 或 aiNextStep 中提醒重新拍攝或持續觀察

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
  const isAnalyzable = booleanWithFallback(
    raw.isAnalyzable,
    raw.aiObservation !== null && raw.aiObservation !== undefined
  );
  const failureReason = isAnalyzable
    ? null
    : (nullableEnum(raw.failureReason, 'failureReason', FAILURE_REASONS) ?? 'unclear');
  const aiObservation = isAnalyzable
    ? requiredText(raw.aiObservation ?? raw.summary, 'aiObservation', 120)
    : null;
  const aiNextStep = isAnalyzable
    ? requiredText(raw.aiNextStep ?? raw.recommendation, 'aiNextStep', 160)
    : null;
  const failureSummaryText = failureSummary(failureReason);
  const failureRecommendation = failureReason === 'system_error'
    ? '請稍後再試，或到歷程查看是否完成。'
    : '請重新拍攝光線充足、便便完整清楚的照片。';

  return {
    aiEscalationSigns: isAnalyzable ? textArray(raw.aiEscalationSigns, 'aiEscalationSigns', 4, 80) : [],
    aiFindings: isAnalyzable ? textArray(raw.aiFindings, 'aiFindings', 4, 60) : [],
    aiNextStep,
    aiObservation,
    aiPossibleReasons: isAnalyzable ? textArray(raw.aiPossibleReasons, 'aiPossibleReasons', 3, 80) : [],
    aiWatchItems: isAnalyzable ? textArray(raw.aiWatchItems, 'aiWatchItems', 4, 80) : [],
    bristolScore: isAnalyzable ? nullableInteger(raw.bristolScore, 'bristolScore', 1, 7) : null,
    color: isAnalyzable ? nullableEnum(raw.color, 'color', COLORS) : null,
    confidence: nullableNumber(raw.confidence, 'confidence', 0, 1),
    consistency: isAnalyzable ? nullableEnum(raw.consistency, 'consistency', CONSISTENCIES) : null,
    failureReason,
    isAnalyzable,
    raw,
    recommendation: isAnalyzable
      ? requiredText(raw.recommendation ?? aiNextStep, 'recommendation', 160)
      : optionalText(raw.recommendation, 160) ?? failureRecommendation,
    summary: isAnalyzable
      ? requiredText(raw.summary ?? aiObservation, 'summary', 120)
      : optionalText(raw.summary, 120) ?? failureSummaryText,
  };
}

function booleanWithFallback(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function failureSummary(reason: FailureReason | null): string {
  if (reason === 'not_poop') return '這張照片無法分析。';
  if (reason === 'unclear') return '照片不夠清楚。';
  return SYSTEM_FAILURE_SUMMARY;
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

function optionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

function textArray(value: unknown, field: string, maxItems: number, maxLength: number): string[] {
  if (value === null || value === undefined) return [];

  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => {
      if (typeof item !== 'string') {
        throw new Error(`Invalid analysis.${field}: expected string array`);
      }

      return item.trim().slice(0, maxLength);
    })
    .filter(Boolean)
    .slice(0, maxItems);
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
    ai_observation: null,
    ai_findings: [],
    ai_possible_reasons: [],
    ai_next_step: null,
    ai_watch_items: [],
    ai_escalation_signs: [],
    summary: SYSTEM_FAILURE_SUMMARY,
    recommendation: null,
    failure_reason: 'system_error',
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
