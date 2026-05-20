import { Image } from 'expo-image';
import type * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { modalStyles as ms } from '@/components/modal-styles';
import { PetPicker } from '@/components/pet-picker';
import { lightImpactFeedback, selectionFeedback } from '@/lib/haptics';
import type { AnalysisFailureReason } from '@/lib/photos/photo-analysis-result';
import type { PhotoAnalysisModalPhase, PhotoAnalysisProcessingStep } from '@/hooks/use-photo-analysis-flow';
import type { Database } from '@/types/database';
import { Brand, Ripple, Surface } from '@/constants/theme';

type Pet = Database['public']['Tables']['pets']['Row'];

export type AnalysisResult = {
  aiEscalationSigns: string[];
  aiFindings: string[];
  aiNextStep: string | null;
  aiObservation: string | null;
  aiPossibleReasons: string[];
  aiWatchItems: string[];
  bristolScore: number | null;
  failed?: boolean;
  failureReason?: AnalysisFailureReason | null;
  imageUrl: string;
  recommendation: string | null;
  summary: string | null;
};

type Props = {
  capturedAsset: ImagePicker.ImagePickerAsset | null;
  isVisible: boolean;
  modalPhase: PhotoAnalysisModalPhase;
  processingProgress: number;
  processingStep: PhotoAnalysisProcessingStep;
  canDismissProcessing: boolean;
  analysisResult: AnalysisResult | null;
  petAssigned: boolean;
  pets: Pet[];
  onAssignPet: (petId: string) => void;
  onClose: () => void;
  onDismissProcessing: () => void;
  onPickPhoto: () => void;
  onRetake: () => void;
  onScheduleFollowUp: () => void | Promise<void>;
};

const STEP_COPY: Record<PhotoAnalysisProcessingStep, {
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}> = {
  uploading: {
    detail: '照片正在送出，請先保持畫面開啟。',
    icon: 'cloud-upload-outline',
    title: '正在上傳照片',
  },
  creating: {
    detail: '已收到照片，正在建立健康紀錄。',
    icon: 'document-text-outline',
    title: '正在建立紀錄',
  },
  analyzing: {
    detail: 'AI 正在整理照片觀察，通常需要 10-30 秒。',
    icon: 'sparkles-outline',
    title: 'AI 正在觀察',
  },
  finalizing: {
    detail: '分析已完成，正在整理結果。',
    icon: 'checkmark-circle-outline',
    title: '正在準備結果',
  },
};

export function PhotoAnalysisModal({
  capturedAsset,
  isVisible,
  modalPhase,
  processingProgress,
  processingStep,
  canDismissProcessing,
  analysisResult,
  petAssigned,
  pets,
  onAssignPet,
  onClose,
  onDismissProcessing,
  onPickPhoto,
  onRetake,
  onScheduleFollowUp,
}: Props) {
  function handleAssignPet(petId: string) {
    selectionFeedback();
    onAssignPet(petId);
  }

  function handleClose() {
    lightImpactFeedback();
    onClose();
  }

  function handleDismissProcessing() {
    lightImpactFeedback();
    onDismissProcessing();
  }

  function handlePickPhoto() {
    lightImpactFeedback();
    onPickPhoto();
  }

  function handleRetake() {
    lightImpactFeedback();
    onRetake();
  }

  function handleScheduleFollowUp() {
    lightImpactFeedback();
    void onScheduleFollowUp();
  }

  const stepCopy = STEP_COPY[processingStep];
  const clampedProgress = Math.max(0, Math.min(1, processingProgress));

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={ms.modalSafe}>

        {modalPhase === 'processing' && (
          <View style={styles.processingContainer}>
            {capturedAsset && (
              <Image source={{ uri: capturedAsset.uri }} style={styles.processingImage} contentFit="cover" />
            )}
            <View style={styles.processingPanel}>
              <View style={styles.processingHeader}>
                <View style={styles.processingIconWrap}>
                  <Ionicons name={stepCopy.icon} size={22} color={Brand.primary} />
                </View>
                <View style={styles.processingTitleWrap}>
                  <Text style={styles.processingTitle}>{stepCopy.title}</Text>
                  <Text style={styles.processingSubtitle}>{stepCopy.detail}</Text>
                </View>
                <ActivityIndicator size="small" color={Brand.primary} />
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${clampedProgress * 100}%` }]} />
              </View>

              <View style={styles.stepRow}>
                <StepDot active={processingStep === 'uploading'} done={clampedProgress >= 0.25} label="上傳" />
                <StepDot active={processingStep === 'creating'} done={clampedProgress >= 0.35} label="紀錄" />
                <StepDot active={processingStep === 'analyzing'} done={clampedProgress >= 0.9} label="分析" />
                <StepDot active={processingStep === 'finalizing'} done={clampedProgress >= 1} label="結果" />
              </View>

              {canDismissProcessing ? (
                <Pressable
                  android_ripple={Ripple.onLight}
                  style={({ pressed }) => [styles.laterButton, pressed && styles.buttonPressed]}
                  onPress={handleDismissProcessing}>
                  <Text style={styles.laterButtonText}>稍後查看</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}

        {modalPhase === 'result' && analysisResult && (
          <ScrollView style={ms.resultScroll} contentContainerStyle={ms.resultContent}>
            {analysisResult.imageUrl ? (
              <Image source={{ uri: analysisResult.imageUrl }} style={ms.resultImage} contentFit="cover" />
            ) : null}

            <View style={ms.resultBody}>
              {analysisResult.failed ? (
                <PhotoFailureState
                  failureReason={analysisResult.failureReason ?? 'system_error'}
                  onPickPhoto={handlePickPhoto}
                  onRetake={handleRetake}
                />
              ) : (
                <AnalysisObservationCard result={analysisResult} />
              )}

              {!analysisResult.failed && (analysisResult.aiNextStep || analysisResult.recommendation) && (
                <View style={ms.recommendBox}>
                  <Text style={ms.recommendLabel}>接下來可以怎麼做</Text>
                  <Text style={ms.recommendText}>
                    {analysisResult.aiNextStep ?? analysisResult.recommendation}
                  </Text>
                </View>
              )}

              {!analysisResult.failed && analysisResult.aiPossibleReasons.length > 0 && (
                <AnalysisListSection
                  icon="bulb-outline"
                  title="可能原因"
                  items={analysisResult.aiPossibleReasons}
                />
              )}

              {!analysisResult.failed && analysisResult.aiWatchItems.length > 0 && (
                <AnalysisListSection
                  icon="eye-outline"
                  title="需要留意"
                  items={analysisResult.aiWatchItems}
                />
              )}

              {!analysisResult.failed && analysisResult.aiEscalationSigns.length > 0 && (
                <AnalysisListSection
                  icon="medical-outline"
                  title="如果之後出現"
                  items={analysisResult.aiEscalationSigns}
                />
              )}

              {!analysisResult.failed && (
                <Pressable
                  android_ripple={Ripple.onLight}
                  style={({ pressed }) => [styles.followUpButton, pressed && styles.buttonPressed]}
                  onPress={handleScheduleFollowUp}>
                  <Ionicons name="notifications-outline" size={16} color={Surface.inkSoft} />
                  <Text style={styles.followUpButtonText}>明天提醒我再記錄一次</Text>
                </Pressable>
              )}

              {!analysisResult.failed && (
                <View style={styles.petPickerSection}>
                  {petAssigned ? (
                    <Text style={styles.petPickerDone}>✓ 已分類</Text>
                  ) : (
                    <>
                      <Text style={styles.petPickerTitle}>
                        {pets.length > 0 ? '這是哪一隻的紀錄？' : '尚未建立寵物檔案'}
                      </Text>
                      {pets.length > 0 ? (
                        <PetPicker pets={pets} onSelect={handleAssignPet} />
                      ) : (
                        <Text style={styles.petPickerEmpty}>
                          你可以先完成這筆紀錄，之後到寵物管理新增檔案再分類。
                        </Text>
                      )}
                      <Pressable
                        android_ripple={Ripple.onLight}
                        style={({ pressed }) => [styles.petPickerSkipButton, pressed && styles.buttonPressed]}
                        onPress={handleClose}>
                        <Text style={styles.petPickerSkip}>
                          {pets.length > 0 ? '略過，之後再分類' : '完成'}
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}
            </View>

            <View style={ms.modalActions}>
              {(petAssigned || analysisResult.failed) && (
                <Pressable
                  android_ripple={Ripple.onDark}
                  style={({ pressed }) => [
                    ms.modalButton,
                    ms.primaryButton,
                    styles.modalButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleClose}>
                  <Text style={ms.primaryButtonText}>完成</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        )}

      </SafeAreaView>
    </Modal>
  );
}

function AnalysisObservationCard({ result }: { result: AnalysisResult }) {
  const observation = result.aiObservation ?? result.summary ?? 'AI 已完成照片觀察。';
  const findings = result.aiFindings.length > 0 ? result.aiFindings : ['照片可判讀'];

  return (
    <View style={ms.observationCard}>
      <View style={styles.observationHeader}>
        <View style={styles.observationIconWrap}>
          <Ionicons name="sparkles-outline" size={20} color={Brand.primary} />
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

function PhotoFailureState({
  failureReason,
  onPickPhoto,
  onRetake,
}: {
  failureReason: AnalysisFailureReason;
  onPickPhoto: () => void;
  onRetake: () => void;
}) {
  const copy = failureCopy(failureReason);

  return (
    <View style={styles.failureWrap}>
      <View style={styles.failureIconWrap}>
        <Ionicons name={copy.icon} size={26} color={copy.iconColor} />
      </View>
      <Text style={styles.failureTitle}>{copy.title}</Text>
      <Text style={styles.failureSubtitle}>{copy.subtitle}</Text>

      {failureReason !== 'system_error' && (
        <View style={styles.photoTips}>
          <PhotoTip icon="scan-outline" label="讓便便完整出現在畫面中央" />
          <PhotoTip icon="sunny-outline" label="保持光線充足，避免陰影遮住" />
          <PhotoTip icon="camera-outline" label="靠近一點拍，避免模糊或太遠" />
        </View>
      )}

      <View style={styles.failureActions}>
        <Pressable
          android_ripple={Ripple.onDark}
          style={({ pressed }) => [styles.failurePrimaryButton, pressed && styles.buttonPressed]}
          onPress={onRetake}>
          <Text style={styles.failurePrimaryText}>
            {failureReason === 'system_error' ? '再試一次' : '重新拍照'}
          </Text>
        </Pressable>
        <Pressable
          android_ripple={Ripple.onLight}
          style={({ pressed }) => [styles.failureSecondaryButton, pressed && styles.buttonPressed]}
          onPress={onPickPhoto}>
          <Text style={styles.failureSecondaryText}>從相簿選照片</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PhotoTip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.photoTipRow}>
      <Ionicons name={icon} size={16} color={Surface.muted} />
      <Text style={styles.photoTipText}>{label}</Text>
    </View>
  );
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

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <View style={styles.stepItem}>
      <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>
        {done ? <Ionicons name="checkmark" size={10} color="#ffffff" /> : null}
      </View>
      <Text style={[styles.stepLabel, (active || done) && styles.stepLabelActive]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  processingContainer: { backgroundColor: Surface.bg, flex: 1 },
  processingImage:     { flex: 1 },
  processingPanel: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    bottom: 0,
    gap: 18,
    left: 0,
    paddingBottom: 26,
    paddingHorizontal: 22,
    paddingTop: 22,
    position: 'absolute',
    right: 0,
  },
  processingHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  processingIconWrap: {
    alignItems: 'center',
    backgroundColor: Surface.bgSoft,
    borderRadius: 16,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  processingTitleWrap: { flex: 1, gap: 3, minWidth: 0 },
  processingTitle:    { color: Surface.ink, fontSize: 20, fontWeight: '800' },
  processingSubtitle: { color: Surface.muted, fontSize: 14, lineHeight: 20 },
  progressTrack: {
    backgroundColor: Surface.bgMuted,
    borderRadius: 999,
    height: 9,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: Brand.primary,
    borderRadius: 999,
    height: '100%',
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: { alignItems: 'center', gap: 6, width: 56 },
  stepDot: {
    alignItems: 'center',
    backgroundColor: Surface.bgMuted,
    borderRadius: 999,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  stepDotActive: { borderColor: Brand.primary, borderWidth: 2 },
  stepDotDone:   { backgroundColor: Brand.primary, borderWidth: 0 },
  stepLabel:     { color: Surface.mutedSoft, fontSize: 12, fontWeight: '700' },
  stepLabelActive: { color: Surface.inkSoft },
  laterButton: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  laterButtonText: { color: Surface.inkSoft, fontSize: 15, fontWeight: '700' },

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
  followUpButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: Surface.bgMuted,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
    overflow: 'hidden',
    paddingHorizontal: 14,
  },
  followUpButtonText: { color: Surface.inkSoft, fontSize: 14, fontWeight: '800' },

  failureWrap: {
    alignItems: 'center',
    backgroundColor: Surface.bgSoft,
    borderColor: Surface.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  failureIconWrap: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  failureTitle: { color: Surface.ink, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  failureSubtitle: { color: Surface.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  photoTips: { alignSelf: 'stretch', gap: 8, paddingTop: 4 },
  photoTipRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  photoTipText: { color: Surface.inkSoft, flex: 1, fontSize: 13, lineHeight: 18 },
  failureActions: { alignSelf: 'stretch', gap: 10, paddingTop: 4 },
  failurePrimaryButton: {
    alignItems: 'center',
    backgroundColor: Brand.primary,
    borderRadius: 16,
    height: 50,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  failurePrimaryText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  failureSecondaryButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: Surface.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  failureSecondaryText: { color: Surface.inkSoft, fontSize: 15, fontWeight: '700' },

  petPickerSection: {
    borderTopColor: Surface.border, borderTopWidth: StyleSheet.hairlineWidth, gap: 12, paddingTop: 16,
  },
  petPickerTitle: {
    color: Surface.muted, fontSize: 13, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase',
  },
  petPickerEmpty: { color: Surface.inkSoft, fontSize: 14, lineHeight: 20 },
  petPickerSkipButton: {
    alignItems: 'center',
    backgroundColor: Surface.bgMuted,
    borderRadius: 14,
    minHeight: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  petPickerSkip:  { color: Surface.inkSoft, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  petPickerDone:  { color: '#16a34a', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  modalButton:    { overflow: 'hidden' },
  buttonPressed:  { opacity: 0.72 },
});
