import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { modalStyles as ms } from '@/components/modal-styles';
import { PetPicker } from '@/components/pet-picker';
import { Button } from '@/components/ui';
import { cancelFollowUp, scheduleLogFollowUp } from '@/lib/notifications';
import type { AnalysisFailureReason } from '@/lib/photos/photo-analysis-result';
import type { HistoryLog } from '@/hooks/use-poop-logs';
import type { Database } from '@/types/database';
import { Surface } from '@/constants/theme';

type Pet = Database['public']['Tables']['pets']['Row'];

type Props = {
  log: HistoryLog;
  onClose: () => void;
  variant?: 'default' | 'follow-up';
  pets?: Pet[];
  onAssignPet?: (petId: string) => void;
  isAssigningPet?: boolean;
};

export function LogDetailContent({
  log,
  onClose,
  variant = 'default',
  pets = [],
  onAssignPet,
  isAssigningPet = false,
}: Props) {
  const isFollowUp = variant === 'follow-up';
  const isFailed = log.status === 'failed';
  const isPending = log.status !== 'done' && !isFailed;
  const failureReason = normalizeFailureReason(log.failureReason);
  const failure = failureCopy(failureReason);

  return (
    <ScrollView style={ms.resultScroll} contentContainerStyle={ms.resultContent}>
      {log.imageUrl ? (
        <Image source={{ uri: log.imageUrl }} style={ms.resultImage} contentFit="cover" />
      ) : (
        <View style={[ms.resultImage, styles.imageFallback]}>
          <Ionicons name="image-outline" size={40} color="#bbc9c7" />
        </View>
      )}

      <View style={ms.resultBody}>
        {isPending ? (
          <View style={styles.pendingBox}>
            <View style={styles.pendingIconWrap}>
              <ActivityIndicator color="#20B2AA" />
            </View>
            <Text style={styles.pendingTitle}>觀察仍在整理中</Text>
            <Text style={styles.pendingSubtitle}>AI 正在整理這張照片，完成後歷程會自動更新結果。</Text>
          </View>
        ) : isFailed ? (
          <View style={styles.failureBox}>
            <View style={styles.failureIconWrap}>
              <Ionicons name={failure.icon} size={24} color={failure.iconColor} />
            </View>
            <Text style={styles.failureTitle}>{failure.title}</Text>
            <Text style={styles.failureSubtitle}>{failure.subtitle}</Text>
          </View>
        ) : (
          <ObservationCard log={log} />
        )}

        {log.note ? (
          <View style={ms.recommendBox}>
            <Text style={ms.recommendLabel}>備註</Text>
            <Text style={ms.recommendText}>{log.note}</Text>
          </View>
        ) : null}

        {!isPending && !isFailed && (log.aiNextStep || log.recommendation) ? (
          <View style={ms.recommendBox}>
            <Text style={ms.recommendLabel}>接下來可以怎麼做</Text>
            <Text style={ms.recommendText}>{log.aiNextStep ?? log.recommendation}</Text>
          </View>
        ) : null}

        {!isPending && !isFailed && log.aiPossibleReasons.length > 0 ? (
          <AnalysisListSection icon="bulb-outline" title="可能原因" items={log.aiPossibleReasons} />
        ) : null}

        {!isPending && !isFailed && log.aiWatchItems.length > 0 ? (
          <AnalysisListSection icon="eye-outline" title="需要留意" items={log.aiWatchItems} />
        ) : null}

        {!isPending && !isFailed && log.aiEscalationSigns.length > 0 ? (
          <AnalysisListSection icon="medical-outline" title="如果之後出現" items={log.aiEscalationSigns} />
        ) : null}

        {isPending || isFailed ? null : log.petId ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>寵物</Text>
            <Text style={styles.infoValue}>{log.petName}</Text>
          </View>
        ) : (
          <View style={styles.unclassifiedBox}>
            <Text style={styles.unclassifiedLabel}>尚未分類</Text>
            {pets.length > 0 && onAssignPet ? (
              <PetPicker
                pets={pets}
                variant="compact"
                disabled={isAssigningPet}
                onSelect={onAssignPet}
              />
            ) : isAssigningPet ? (
              <ActivityIndicator color="#20B2AA" />
            ) : null}
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>時間</Text>
          <Text style={styles.infoValue}>{new Date(log.capturedAt).toLocaleString('zh-TW')}</Text>
        </View>
      </View>

      {isFollowUp && !isFailed ? (
        <View style={ms.modalActions}>
          <Text style={styles.followUpLabel}>今天要再記錄一次嗎？</Text>
          <Button
            label="我已經記錄了"
            onPress={() => { void cancelFollowUp(log.id); onClose(); }}
          />
          <Button
            label="明天再提醒"
            variant="ghost"
            onPress={() => { void scheduleLogFollowUp(log.id); onClose(); }}
          />
        </View>
      ) : (
        <View style={ms.modalActions}>
          <Button label="關閉" onPress={onClose} />
        </View>
      )}
    </ScrollView>
  );
}

function ObservationCard({ log }: { log: HistoryLog }) {
  const observation = log.aiObservation ?? log.summary ?? 'AI 已完成照片觀察。';
  const findings = log.aiFindings.length > 0 ? log.aiFindings : ['照片可判讀'];

  return (
    <View style={ms.observationCard}>
      <View style={styles.observationHeader}>
        <View style={styles.observationIconWrap}>
          <Ionicons name="sparkles-outline" size={20} color="#20B2AA" />
        </View>
        <View style={styles.observationTitleWrap}>
          <Text style={ms.observationTitle}>AI 觀察</Text>
          <Text style={ms.observationText}>{observation}</Text>
        </View>
      </View>
      <View style={styles.findingWrap}>
        {findings.map((finding) => (
          <View key={finding} style={styles.findingChip}>
            <Text style={styles.findingText}>{finding}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function AnalysisListSection({
  icon,
  items,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  items: string[];
  title: string;
}) {
  return (
    <View style={styles.analysisListBox}>
      <View style={styles.analysisListHeader}>
        <Ionicons name={icon} size={16} color={Surface.muted} />
        <Text style={styles.analysisListTitle}>{title}</Text>
      </View>
      {items.map((item) => (
        <View key={item} style={styles.analysisListRow}>
          <View style={styles.analysisListDot} />
          <Text style={styles.analysisListText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function normalizeFailureReason(value: string | null | undefined): AnalysisFailureReason {
  if (value === 'not_poop' || value === 'unclear' || value === 'system_error') return value;
  return 'system_error';
}

function failureCopy(reason: AnalysisFailureReason) {
  if (reason === 'not_poop') {
    return {
      icon: 'image-outline' as const,
      iconColor: Surface.inkSoft,
      subtitle: '看起來不像可判讀的便便照片。請重新拍攝清楚、完整的便便畫面。',
      title: '這張照片無法分析',
    };
  }

  if (reason === 'unclear') {
    return {
      icon: 'scan-outline' as const,
      iconColor: Surface.inkSoft,
      subtitle: 'AI 無法從這張照片整理可靠觀察，請重新拍攝更清楚的畫面。',
      title: '照片不夠清楚',
    };
  }

  return {
    icon: 'cloud-offline-outline' as const,
    iconColor: '#92400e',
    subtitle: '連線或分析服務暫時不穩，請稍後再試。',
    title: '暫時無法完成分析',
  };
}

type ModalProps = Omit<Props, 'log'> & {
  log: HistoryLog | null;
};

export function LogDetailModal({ log, ...rest }: ModalProps) {
  return (
    <Modal visible={!!log} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={ms.modalSafe}>
        {log ? <LogDetailContent log={log} {...rest} /> : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  imageFallback: { alignItems: 'center', backgroundColor: Surface.bgMuted, justifyContent: 'center' },

  pendingBox: {
    alignItems: 'center',
    backgroundColor: Surface.bgSoft,
    borderColor: Surface.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  pendingIconWrap: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  pendingTitle: { color: Surface.ink, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  pendingSubtitle: { color: Surface.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },

  failureBox: {
    alignItems: 'center',
    backgroundColor: Surface.bgSoft,
    borderColor: Surface.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  failureIconWrap: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  failureTitle: { color: Surface.ink, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  failureSubtitle: { color: Surface.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },

  observationHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  observationIconWrap: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  observationTitleWrap: { flex: 1, gap: 4, minWidth: 0 },
  findingWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  findingChip: {
    backgroundColor: '#ffffff',
    borderColor: Surface.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  findingText: { color: Surface.inkSoft, fontSize: 13, fontWeight: '700' },
  analysisListBox: {
    backgroundColor: Surface.bgSoft,
    borderRadius: 12,
    gap: 9,
    padding: 14,
  },
  analysisListHeader: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  analysisListTitle: { color: Surface.muted, fontSize: 13, fontWeight: '700' },
  analysisListRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 9 },
  analysisListDot: {
    backgroundColor: Surface.mutedSoft,
    borderRadius: 999,
    height: 5,
    marginTop: 8,
    width: 5,
  },
  analysisListText: { color: Surface.inkSoft, flex: 1, fontSize: 14, lineHeight: 20 },

  infoRow: {
    alignItems: 'center', backgroundColor: Surface.bgSoft, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'space-between', padding: 14,
  },
  infoLabel: { color: Surface.muted, fontSize: 15 },
  infoValue: { color: Surface.ink, fontSize: 15, fontWeight: '700' },

  unclassifiedBox: { backgroundColor: Surface.bgSoft, borderRadius: 12, gap: 10, padding: 14 },
  unclassifiedLabel: {
    color: Surface.muted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  followUpLabel: {
    color: Surface.inkSoft,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
});
