import type { Database } from '@/types/database';

type RiskLevel = Database['public']['Tables']['poop_logs']['Row']['risk_level'];
type ManualStatus = Database['public']['Tables']['poop_logs']['Row']['manual_status'];

export type LogSignal = {
  captured_at: string;
  entry_mode: string;
  manual_status: ManualStatus;
  risk_level: RiskLevel;
};

export type CatalogRarity = 'common' | 'uncommon' | 'rare';

export type CatalogEntry = {
  key: string;
  title: string;
  description: string;
  education: string;
  emoji: string;
  rarity: CatalogRarity;
  unlockHint: string;
  isUnlocked: (rows: LogSignal[]) => boolean;
};

export type Achievement = {
  key: string;
  title: string;
  description: string;
  emoji: string;
  target: number;
  progress: (rows: LogSignal[]) => number;
};

export type RewardFeedback = {
  title: string;
  body: string;
  emoji: string;
};

export const EDUCATION_CARDS = [
  {
    key: 'tip-observe',
    title: '偏軟先看 24 小時',
    body: '如果只有一次偏軟，先觀察精神、食慾與喝水狀況，持續兩次以上再提高警覺。',
    emoji: '🫶',
  },
  {
    key: 'tip-sample',
    title: '異常時記得保留樣本',
    body: '若出現血便、黑便或嚴重水瀉，保留照片或少量樣本，能幫助獸醫更快判斷。',
    emoji: '🧪',
  },
  {
    key: 'tip-routine',
    title: '穩定記錄比精準更重要',
    body: '不用每次都拍照，只要把狀態記下來，異常變化就比較容易被看見。',
    emoji: '📒',
  },
] as const;

export const CATALOG_ENTRIES: CatalogEntry[] = [
  {
    key: 'steady-normal',
    title: '穩定成形便',
    description: '成形、狀態穩定，是最安心的日常紀錄。',
    education: '維持固定飲食與作息，通常能讓糞便型態更穩定。',
    emoji: '✅',
    rarity: 'common',
    unlockHint: '完成一筆正常紀錄',
    isUnlocked: (rows) => rows.some((row) => effectiveRisk(row) === 'normal'),
  },
  {
    key: 'watch-soft',
    title: '觀察便',
    description: '出現需要觀察的狀態，提醒你留意後續變化。',
    education: '偏軟不一定嚴重，但若連續兩次以上或伴隨精神差，就該提高警覺。',
    emoji: '🟡',
    rarity: 'uncommon',
    unlockHint: '完成一筆偏軟或觀察紀錄',
    isUnlocked: (rows) =>
      rows.some(
        (row) =>
          row.manual_status === 'soft' ||
          (row.entry_mode === 'photo_ai' && row.risk_level === 'observe')
      ),
  },
  {
    key: 'watch-hard',
    title: '偏硬便',
    description: '排便偏乾偏硬，通常和水分、纖維或活動量有關。',
    education: '偏硬時可以留意飲水量與活動量，若持續發生再調整日常照護。',
    emoji: '🟤',
    rarity: 'uncommon',
    unlockHint: '完成一筆偏硬紀錄',
    isUnlocked: (rows) => rows.some((row) => row.manual_status === 'hard'),
  },
  {
    key: 'alert-vet',
    title: '警訊便',
    description: '出現需要盡快就醫的異常訊號時，先記錄下來才能更快追蹤。',
    education: '血便、黑便、灰白色或嚴重水瀉都屬於高風險訊號，請盡快就醫。',
    emoji: '🚨',
    rarity: 'rare',
    unlockHint: '完成一筆異常或就醫紀錄',
    isUnlocked: (rows) =>
      rows.some(
        (row) =>
          row.manual_status === 'abnormal' ||
          (row.entry_mode === 'photo_ai' && row.risk_level === 'vet')
      ),
  },
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    key: 'first-record',
    title: '開始照護',
    description: '完成第一筆記錄。',
    emoji: '🌱',
    target: 1,
    progress: (rows) => rows.length,
  },
  {
    key: 'five-records',
    title: '穩定陪伴',
    description: '累積完成 5 筆記錄。',
    emoji: '🧡',
    target: 5,
    progress: (rows) => rows.length,
  },
  {
    key: 'quick-keeper',
    title: '快速紀錄手',
    description: '完成 3 筆快速記錄。',
    emoji: '⚡️',
    target: 3,
    progress: (rows) => rows.filter((row) => row.entry_mode === 'quick_log').length,
  },
  {
    key: 'care-checker',
    title: '主動檢查員',
    description: '完成 2 次拍照分析。',
    emoji: '📸',
    target: 2,
    progress: (rows) => rows.filter((row) => row.entry_mode === 'photo_ai').length,
  },
];

export function effectiveRisk(row: LogSignal): RiskLevel {
  if (row.entry_mode === 'photo_ai') return row.risk_level;

  switch (row.manual_status) {
    case 'normal':
      return 'normal';
    case 'soft':
    case 'hard':
      return 'observe';
    case 'abnormal':
      return 'vet';
    default:
      return null;
  }
}

export function rarityLabel(rarity: CatalogRarity): string {
  switch (rarity) {
    case 'common':
      return '日常';
    case 'uncommon':
      return '觀察';
    case 'rare':
      return '警訊';
  }
}

export function rarityTone(rarity: CatalogRarity) {
  switch (rarity) {
    case 'common':
      return { backgroundColor: '#d8f3e8', textColor: '#065f46' };
    case 'uncommon':
      return { backgroundColor: '#fef3c7', textColor: '#92400e' };
    case 'rare':
      return { backgroundColor: '#fde8e8', textColor: '#9a3412' };
  }
}

export function getCatalogProgress(rows: LogSignal[]) {
  const unlocked = CATALOG_ENTRIES.filter((entry) => entry.isUnlocked(rows));
  const locked = CATALOG_ENTRIES.filter((entry) => !entry.isUnlocked(rows));

  return { locked, unlocked };
}

export function getAchievementProgress(rows: LogSignal[]) {
  return ACHIEVEMENTS.map((achievement) => {
    const current = achievement.progress(rows);
    return {
      ...achievement,
      current,
      unlocked: current >= achievement.target,
    };
  });
}

export function buildRewardFeedback(beforeRows: LogSignal[], nextRow: LogSignal): RewardFeedback | null {
  const afterRows = [nextRow, ...beforeRows];

  const newCatalogEntry = CATALOG_ENTRIES.find(
    (entry) => !entry.isUnlocked(beforeRows) && entry.isUnlocked(afterRows)
  );

  const newAchievement = ACHIEVEMENTS.find((achievement) => {
    const before = achievement.progress(beforeRows);
    const after = achievement.progress(afterRows);
    return before < achievement.target && after >= achievement.target;
  });

  if (newCatalogEntry && newAchievement) {
    return {
      title: '新回饋已解鎖',
      body: `${newCatalogEntry.title}、${newAchievement.title}`,
      emoji: '✨',
    };
  }

  if (newCatalogEntry) {
    return {
      title: '新圖鑑解鎖',
      body: newCatalogEntry.title,
      emoji: newCatalogEntry.emoji,
    };
  }

  if (newAchievement) {
    return {
      title: '成就達成',
      body: newAchievement.title,
      emoji: newAchievement.emoji,
    };
  }

  return null;
}
