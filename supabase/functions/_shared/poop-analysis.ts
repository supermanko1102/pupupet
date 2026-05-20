import Anthropic from 'npm:@anthropic-ai/sdk@0.97.1';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@4.4.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;

const MODEL = 'claude-opus-4-7';
const TOOL_NAME = 'submit_observation';
const SYSTEM_FAILURE_SUMMARY = '暫時無法完成分析，請稍後再試。';

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

const IMAGE_MEDIA_TYPES = new Set<ImageMediaType>([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

type ImagePayload = {
  base64: string;
  mediaType: ImageMediaType;
};

// ─── Zod schema: single source of truth for tool input ────────────────────────

const PoopColor = z.enum(['brown', 'yellow', 'black', 'red', 'green', 'other']);
const Consistency = z.enum(['hard', 'normal', 'soft', 'liquid']);
const FailureReasonEnum = z.enum(['not_poop', 'unclear']);

const ToolInputSchema = z.object({
  isAnalyzable: z
    .boolean()
    .describe('照片中有清楚可判讀的寵物糞便時為 true，否則 false'),
  failureReason: FailureReasonEnum
    .nullable()
    .describe('isAnalyzable=false 時必填：not_poop（不是糞便）/ unclear（不夠清楚）'),
  bristolScore: z
    .number()
    .int()
    .nullable()
    .describe('Bristol Stool Scale 1-7 整數，無法判斷填 null'),
  color: PoopColor.nullable().describe('主要顏色，無法判斷填 null'),
  consistency: Consistency.nullable().describe('整體質地，無法判斷填 null'),
  aiObservation: z
    .string()
    .nullable()
    .describe('一句中文照片觀察，60 字以內；isAnalyzable=false 時填重拍說明或 null'),
  aiFindings: z
    .array(z.string())
    .describe('可見特徵 1-4 個的中文字串陣列；isAnalyzable=false 時填空陣列'),
  aiPossibleReasons: z
    .array(z.string())
    .describe('非診斷性的可能背景或原因 0-3 個；可解釋顏色偏差或外觀差異'),
  aiNextStep: z
    .string()
    .nullable()
    .describe('給飼主的下一步中文建議，80 字以內；isAnalyzable=false 時填重拍建議或 null'),
  aiWatchItems: z
    .array(z.string())
    .describe('接下來可留意的點 0-4 個；isAnalyzable=false 時填空陣列'),
  aiEscalationSigns: z
    .array(z.string())
    .describe('未來若持續或合併出現應聯絡獸醫的警訊 0-4 個；isAnalyzable=false 時填空陣列'),
  confidence: z
    .number()
    .nullable()
    .describe('整體分析可信度 0.0-1.0'),
});

type ToolInput = z.infer<typeof ToolInputSchema>;
type FailureReason = z.infer<typeof FailureReasonEnum> | 'system_error';

type Analysis = ToolInput & {
  failureReason: FailureReason | null;
  raw: Record<string, unknown>;
  summary: string;
  recommendation: string;
};

const TOOL_INPUT_JSON_SCHEMA = z.toJSONSchema(ToolInputSchema, { target: 'draft-7' });

// ─── Limits applied defensively after model output ────────────────────────────

const MAX_OBSERVATION = 120;
const MAX_NEXT_STEP = 160;
const MAX_FINDING = 60;
const MAX_LIST_ITEM = 80;
const MAX_FINDINGS = 4;
const MAX_POSSIBLE_REASONS = 3;
const MAX_WATCH_ITEMS = 4;
const MAX_ESCALATION_SIGNS = 4;

const SYSTEM_PROMPT = `你是一位寵物健康觀察助理。請觀察使用者上傳的寵物糞便照片，並透過 ${TOOL_NAME} 工具回傳結果。

判讀規則：
- 如果照片看起來不是寵物糞便：isAnalyzable=false, failureReason="not_poop"
- 如果照片太暗、太模糊、太遠、糞便被遮擋或不完整：isAnalyzable=false, failureReason="unclear"
- isAnalyzable=false 時：bristolScore/color/consistency 填 null，所有 ai* 陣列填 []，aiObservation/aiNextStep 可寫重拍說明或填 null
- 只有照片清楚可判讀時：isAnalyzable=true，並填外觀觀察欄位

語氣規則：
- 不要輸出 riskLevel、normal、observe、vet 或任何分級欄位
- 不要使用「診斷」「判定」「確診」「必須就醫」等診斷或命令語氣
- 使用「照片中看起來」「可見」「可能」「建議接下來留意」等觀察語氣
- 顏色或形狀和典型棕色成形糞便不同時，只描述你看到的外觀與可觀察方向，不要下醫療結論
- aiEscalationSigns 只描述未來若持續或合併出現時可聯絡獸醫的警訊（例如反覆血色、黑色焦油狀、持續水便、嘔吐、精神或食慾下降）
- 如果疑似光線、陰影、相機白平衡或食物染色造成顏色偏差，請在 aiPossibleReasons 或 aiNextStep 中提醒重新拍攝或持續觀察`;

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
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: TOOL_NAME,
        description: '回傳對寵物糞便照片的觀察結果（非醫療診斷）。',
        input_schema: TOOL_INPUT_JSON_SCHEMA as Anthropic.Messages.Tool.InputSchema,
      },
    ],
    tool_choice: { type: 'tool', name: TOOL_NAME, disable_parallel_tool_use: true },
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
          { type: 'text', text: '請觀察這張照片並呼叫 submit_observation 工具回傳結果。' },
        ],
      },
    ],
  });

  const toolUse = message.content.find(
    (block: { type: string }) => block.type === 'tool_use',
  );
  if (!toolUse || toolUse.type !== 'tool_use' || toolUse.name !== TOOL_NAME) {
    throw new Error(
      `Expected tool_use(${TOOL_NAME}); got stop_reason=${message.stop_reason}`,
    );
  }

  const raw = toolUse.input as Record<string, unknown>;
  const parsed = ToolInputSchema.parse(raw);
  return normalizeAnalysis(parsed, raw);
}

function normalizeAnalysis(input: ToolInput, raw: Record<string, unknown>): Analysis {
  const isAnalyzable = input.isAnalyzable === true;

  if (!isAnalyzable) {
    const failureReason: FailureReason = input.failureReason ?? 'unclear';
    return {
      ...input,
      isAnalyzable: false,
      failureReason,
      aiObservation: trimToNull(input.aiObservation, MAX_OBSERVATION),
      aiFindings: [],
      aiPossibleReasons: [],
      aiNextStep: trimToNull(input.aiNextStep, MAX_NEXT_STEP),
      aiWatchItems: [],
      aiEscalationSigns: [],
      bristolScore: null,
      color: null,
      consistency: null,
      raw,
      summary: failureSummary(failureReason),
      recommendation: failureRecommendation(failureReason),
    };
  }

  const aiObservation = trimToNull(input.aiObservation, MAX_OBSERVATION)
    ?? '照片觀察已完成。';
  const aiNextStep = trimToNull(input.aiNextStep, MAX_NEXT_STEP)
    ?? '可以再多拍幾張同一隻寵物的便便照片，追蹤後續狀況。';

  return {
    ...input,
    isAnalyzable: true,
    failureReason: null,
    aiObservation,
    aiFindings: clampStringArray(input.aiFindings, MAX_FINDINGS, MAX_FINDING),
    aiPossibleReasons: clampStringArray(input.aiPossibleReasons, MAX_POSSIBLE_REASONS, MAX_LIST_ITEM),
    aiNextStep,
    aiWatchItems: clampStringArray(input.aiWatchItems, MAX_WATCH_ITEMS, MAX_LIST_ITEM),
    aiEscalationSigns: clampStringArray(input.aiEscalationSigns, MAX_ESCALATION_SIGNS, MAX_LIST_ITEM),
    bristolScore: clampInteger(input.bristolScore, 1, 7),
    color: input.color,
    consistency: input.consistency,
    confidence: clampNumber(input.confidence, 0, 1),
    raw,
    summary: aiObservation,
    recommendation: aiNextStep,
  };
}

function trimToNull(value: string | null | undefined, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  const text = value.trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function clampStringArray(values: string[], maxItems: number, maxLength: number): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const text = value.trim().slice(0, maxLength);
    if (text) out.push(text);
    if (out.length >= maxItems) break;
  }
  return out;
}

function clampInteger(value: number | null, min: number, max: number): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

function clampNumber(value: number | null, min: number, max: number): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function failureSummary(reason: FailureReason): string {
  if (reason === 'not_poop') return '這張照片無法分析。';
  if (reason === 'unclear') return '照片不夠清楚。';
  return SYSTEM_FAILURE_SUMMARY;
}

function failureRecommendation(reason: FailureReason): string {
  if (reason === 'system_error') return '請稍後再試，或到歷程查看是否完成。';
  return '請重新拍攝光線充足、便便完整清楚的照片。';
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
    recommendation: failureRecommendation('system_error'),
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
