import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { modalStyles as ms } from '@/components/modal-styles';
import { lightImpactFeedback, selectionFeedback } from '@/lib/haptics';
import { toneBorderColor } from '@/lib/log-utils';
import type { Database } from '@/types/database';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ManualStatus = Database['public']['Tables']['poop_logs']['Row']['manual_status'];

const QUICK_STATUS_OPTIONS: {
  value: NonNullable<ManualStatus>;
  label: string;
  emoji: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
}[] = [
  { value: 'normal',   label: '正常', emoji: '✅', tone: 'success' },
  { value: 'soft',     label: '偏軟', emoji: '🟡', tone: 'warning' },
  { value: 'hard',     label: '偏硬', emoji: '🟤', tone: 'warning' },
  { value: 'abnormal', label: '異常', emoji: '🚨', tone: 'danger' },
];

type StatusCardProps = {
  option: (typeof QUICK_STATUS_OPTIONS)[number];
  selected: boolean;
  onSelect: () => void;
};

function StatusCard({ option, selected, onSelect }: StatusCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handleSelect() {
    if (!selected) selectionFeedback();
    onSelect();
  }

  return (
    <AnimatedPressable
      android_ripple={BUTTON_RIPPLE}
      style={[
        styles.statusCard,
        selected && styles.statusCardSelected,
        selected && { borderColor: toneBorderColor(option.tone) },
        animatedStyle,
      ]}
      onPress={handleSelect}
      onPressIn={() => { scale.value = withSpring(0.94, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}>
      <Text style={styles.statusEmoji}>{option.emoji}</Text>
      <Text style={[styles.statusLabel, selected && { color: '#171d1c', fontWeight: '700' }]}>
        {option.label}
      </Text>
    </AnimatedPressable>
  );
}

type Props = {
  visible: boolean;
  selectedStatus: NonNullable<ManualStatus> | null;
  quickNote: string;
  quickLogDone: boolean;
  isPending: boolean;
  onSelectStatus: (status: NonNullable<ManualStatus>) => void;
  onChangeNote: (note: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function QuickLogModal({
  visible,
  selectedStatus,
  quickNote,
  quickLogDone,
  isPending,
  onSelectStatus,
  onChangeNote,
  onSubmit,
  onClose,
}: Props) {
  function handleClose() {
    lightImpactFeedback();
    onClose();
  }

  function handleSubmit() {
    lightImpactFeedback();
    onSubmit();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={ms.modalSafe}>
        {quickLogDone ? (
          <View style={styles.quickDoneContainer}>
            <Text style={styles.quickDoneEmoji}>
              {selectedStatus === 'normal' ? '✅' : selectedStatus === 'abnormal' ? '🚨' : '📝'}
            </Text>
            <Text style={styles.quickDoneTitle}>記錄完成</Text>
            {(selectedStatus === 'abnormal' || selectedStatus === 'soft') && (
              <View style={ms.trackingNotice}>
                <Ionicons name="notifications-outline" size={16} color="#92400e" />
                <Text style={ms.trackingNoticeText}>明天會提醒你追蹤狀況</Text>
              </View>
            )}
            <Pressable
              android_ripple={BUTTON_RIPPLE_ON_DARK}
              style={({ pressed }) => [
                ms.modalButton,
                ms.primaryButton,
                { marginTop: 24, width: '80%' },
                styles.modalButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleClose}>
              <Text style={ms.primaryButtonText}>好</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.quickLogContainer}>
            <Text style={styles.quickLogTitle}>今天狀況如何？</Text>
            <Text style={styles.quickLogSubtitle}>選一個最接近的描述</Text>

            <View style={styles.statusGrid}>
              {QUICK_STATUS_OPTIONS.map((opt) => (
                <StatusCard
                  key={opt.value}
                  option={opt}
                  selected={selectedStatus === opt.value}
                  onSelect={() => onSelectStatus(opt.value)}
                />
              ))}
            </View>

            <View style={styles.noteInputWrap}>
              <TextInput
                style={styles.noteInput}
                placeholder="補充備註（可略）"
                placeholderTextColor="#bbc9c7"
                value={quickNote}
                onChangeText={onChangeNote}
                maxLength={100}
              />
            </View>

            <View style={ms.modalActions}>
              <Pressable
                android_ripple={BUTTON_RIPPLE_ON_DARK}
                style={({ pressed }) => [
                  ms.modalButton,
                  ms.primaryButton,
                  styles.modalButton,
                  !selectedStatus && ms.buttonDisabled,
                  pressed && selectedStatus && !isPending && styles.buttonPressed,
                ]}
                disabled={!selectedStatus || isPending}
                onPress={handleSubmit}>
                {isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={ms.primaryButtonText}>記錄</Text>
                )}
              </Pressable>
              <Pressable
                android_ripple={BUTTON_RIPPLE}
                style={({ pressed }) => [
                  ms.modalButton,
                  ms.ghostButton,
                  styles.modalButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleClose}>
                <Text style={ms.ghostButtonText}>取消</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  quickLogContainer: { flex: 1, paddingTop: 32 },
  quickLogTitle: {
    color: '#171d1c', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 6,
  },
  quickLogSubtitle: { color: '#6c7a78', fontSize: 15, textAlign: 'center', marginBottom: 32 },
  statusGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', paddingHorizontal: 24,
  },
  statusCard: {
    alignItems: 'center', backgroundColor: '#f5fbf9', borderColor: '#e3e9e8',
    borderRadius: 16, borderWidth: 2, gap: 8, overflow: 'hidden', paddingVertical: 20, width: '44%',
  },
  statusCardSelected: { backgroundColor: '#f0fdf9' },
  statusEmoji:        { fontSize: 36 },
  statusLabel:        { color: '#6c7a78', fontSize: 16, fontWeight: '600' },
  noteInputWrap:      { marginHorizontal: 24, marginTop: 20 },
  noteInput: {
    backgroundColor: '#f5fbf9', borderColor: '#e3e9e8', borderRadius: 12,
    borderWidth: 1, color: '#171d1c', fontSize: 15, padding: 14,
  },
  quickDoneContainer: { alignItems: 'center', flex: 1, justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  quickDoneEmoji:     { fontSize: 64 },
  quickDoneTitle:     { color: '#171d1c', fontSize: 24, fontWeight: '700' },
  modalButton:        { overflow: 'hidden' },
  buttonPressed:      { opacity: 0.72 },
});

const BUTTON_RIPPLE = { color: 'rgba(23, 29, 28, 0.08)' };
const BUTTON_RIPPLE_ON_DARK = { color: 'rgba(255, 255, 255, 0.18)' };
