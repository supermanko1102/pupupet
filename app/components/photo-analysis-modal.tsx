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
import { riskBannerStyle, riskIcon, riskTitle } from '@/lib/log-utils';
import type { Database } from '@/types/database';

type RiskLevel = Database['public']['Tables']['poop_logs']['Row']['risk_level'];
type Pet = Database['public']['Tables']['pets']['Row'];

export type AnalysisResult = {
  bristolScore: number | null;
  failed?: boolean;
  imageUrl: string;
  recommendation: string | null;
  riskLevel: RiskLevel;
  summary: string | null;
};

type Props = {
  capturedAsset: ImagePicker.ImagePickerAsset | null;
  modalPhase: 'analyzing' | 'result';
  analysisResult: AnalysisResult | null;
  petAssigned: boolean;
  pets: Pet[];
  onAssignPet: (petId: string) => void;
  onClose: () => void;
};

export function PhotoAnalysisModal({
  capturedAsset,
  modalPhase,
  analysisResult,
  petAssigned,
  pets,
  onAssignPet,
  onClose,
}: Props) {
  return (
    <Modal visible={!!capturedAsset} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={ms.modalSafe}>

        {modalPhase === 'analyzing' && (
          <View style={styles.analyzingContainer}>
            {capturedAsset && (
              <Image source={{ uri: capturedAsset.uri }} style={styles.analyzingImage} contentFit="cover" />
            )}
            <View style={styles.analyzingOverlay}>
              <ActivityIndicator size="large" color="#20B2AA" />
              <Text style={styles.analyzingTitle}>AI 分析中...</Text>
              <Text style={styles.analyzingSubtitle}>正在分析健康狀況，請稍候</Text>
            </View>
          </View>
        )}

        {modalPhase === 'result' && analysisResult && (
          <ScrollView style={ms.resultScroll} contentContainerStyle={ms.resultContent}>
            {analysisResult.imageUrl ? (
              <Image source={{ uri: analysisResult.imageUrl }} style={ms.resultImage} contentFit="cover" />
            ) : null}

            <View style={ms.resultBody}>
              <View style={[ms.riskBanner, riskBannerStyle(analysisResult.failed ? null : analysisResult.riskLevel)]}>
                <Text style={ms.riskBannerIcon}>
                  {analysisResult.failed ? '❌' : riskIcon(analysisResult.riskLevel)}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[ms.riskBannerTitle, { color: riskBannerStyle(analysisResult.failed ? null : analysisResult.riskLevel).textColor }]}>
                    {analysisResult.failed ? '分析失敗' : riskTitle(analysisResult.riskLevel)}
                  </Text>
                  <Text style={[ms.riskBannerSub, { color: riskBannerStyle(analysisResult.failed ? null : analysisResult.riskLevel).textColor }]}>
                    {analysisResult.summary ?? ''}
                  </Text>
                </View>
              </View>

              {analysisResult.recommendation && (
                <View style={ms.recommendBox}>
                  <Text style={ms.recommendLabel}>建議</Text>
                  <Text style={ms.recommendText}>{analysisResult.recommendation}</Text>
                </View>
              )}

              {!analysisResult.failed && (analysisResult.riskLevel === 'vet' || analysisResult.riskLevel === 'observe') && (
                <View style={ms.trackingNotice}>
                  <Ionicons name="notifications-outline" size={16} color="#92400e" />
                  <Text style={ms.trackingNoticeText}>明天會提醒你追蹤狀況</Text>
                </View>
              )}

              {!analysisResult.failed && (
                <View style={styles.petPickerSection}>
                  {petAssigned ? (
                    <Text style={styles.petPickerDone}>✓ 已分類</Text>
                  ) : (
                    <>
                      <Text style={styles.petPickerTitle}>這是哪一隻的紀錄？</Text>
                      {pets.length > 0 && (
                        <View style={styles.petPickerRow}>
                          {pets.map((pet) => (
                            <Pressable
                              key={pet.id}
                              style={styles.petPickerButton}
                              onPress={() => onAssignPet(pet.id)}>
                              <Text style={styles.petPickerEmoji}>
                                {pet.species === 'dog' ? '🐶' : pet.species === 'cat' ? '🐱' : '🐾'}
                              </Text>
                              <Text style={styles.petPickerName}>{pet.name}</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                      <Pressable onPress={onClose}>
                        <Text style={styles.petPickerSkip}>略過，之後再分類</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}
            </View>

            <View style={ms.modalActions}>
              {(petAssigned || analysisResult.failed) && (
                <Pressable style={[ms.modalButton, ms.primaryButton]} onPress={onClose}>
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

const styles = StyleSheet.create({
  analyzingContainer: { flex: 1, position: 'relative' },
  analyzingImage:     { flex: 1, opacity: 0.4 },
  analyzingOverlay: {
    alignItems: 'center', bottom: 0, gap: 12, justifyContent: 'center',
    left: 0, position: 'absolute', right: 0, top: 0,
  },
  analyzingTitle:    { color: '#171d1c', fontSize: 22, fontWeight: '700' },
  analyzingSubtitle: { color: '#6c7a78', fontSize: 15 },

  petPickerSection: {
    borderTopColor: '#e3e9e8', borderTopWidth: StyleSheet.hairlineWidth, gap: 12, paddingTop: 16,
  },
  petPickerTitle: {
    color: '#6c7a78', fontSize: 13, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase',
  },
  petPickerRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  petPickerButton: {
    alignItems: 'center', backgroundColor: '#f5fbf9', borderColor: '#e3e9e8',
    borderRadius: 12, borderWidth: 1, flexDirection: 'row',
    gap: 6, paddingHorizontal: 14, paddingVertical: 10,
  },
  petPickerEmoji: { fontSize: 18 },
  petPickerName:  { color: '#171d1c', fontSize: 15, fontWeight: '600' },
  petPickerSkip:  { color: '#bbc9c7', fontSize: 14, textAlign: 'center' },
  petPickerDone:  { color: '#16a34a', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
