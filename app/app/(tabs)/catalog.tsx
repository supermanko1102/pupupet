import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useStats } from '@/hooks/use-poop-logs';
import {
  EDUCATION_CARDS,
  getAchievementProgress,
  getCatalogProgress,
  rarityLabel,
  rarityTone,
} from '@/lib/catalog';

export default function CatalogScreen() {
  const { data: statsData, isLoading, isRefetching, refetch } = useStats();

  const rows = statsData?.rows ?? [];
  const { unlocked, locked } = getCatalogProgress(rows);
  const achievements = getAchievementProgress(rows);
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#20B2AA" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor="#20B2AA"
          />
        }
        showsVerticalScrollIndicator={false}>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Delight Layer</Text>
          <Text style={styles.heroTitle}>圖鑑與成就</Text>
          <Text style={styles.heroSubtitle}>
            每次記錄都留下一點痕跡，讓照護過程看得見。
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryValue}>{unlocked.length}</Text>
            <Text style={styles.summaryLabel}>已解鎖圖鑑</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryValue}>{unlockedAchievements.length}</Text>
            <Text style={styles.summaryLabel}>已達成成就</Text>
          </View>
        </View>

        {rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="sparkles-outline" size={30} color="#20B2AA" />
            <Text style={styles.emptyTitle}>先完成第一筆記錄</Text>
            <Text style={styles.emptySubtitle}>
              圖鑑會依你經歷過的便便類型解鎖，成就則會記住你的照護行為。
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>已解鎖圖鑑</Text>
          <View style={styles.grid}>
            {unlocked.map((entry) => {
              const tone = rarityTone(entry.rarity);
              return (
                <View key={entry.key} style={styles.catalogCard}>
                  <View style={styles.catalogTopRow}>
                    <Text style={styles.catalogEmoji}>{entry.emoji}</Text>
                    <View style={[styles.rarityPill, { backgroundColor: tone.backgroundColor }]}>
                      <Text style={[styles.rarityText, { color: tone.textColor }]}>
                        {rarityLabel(entry.rarity)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.catalogTitle}>{entry.title}</Text>
                  <Text style={styles.catalogDescription} numberOfLines={2}>
                    {entry.description}
                  </Text>
                  <Text style={styles.catalogEducation} numberOfLines={3}>
                    {entry.education}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {locked.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>尚未解鎖</Text>
            <View style={styles.grid}>
              {locked.map((entry) => (
                <View key={entry.key} style={[styles.catalogCard, styles.catalogCardLocked]}>
                  <Text style={styles.catalogEmojiLocked}>◌</Text>
                  <Text style={styles.catalogTitleLocked}>{entry.title}</Text>
                  <Text style={styles.catalogHint} numberOfLines={2}>
                    {entry.unlockHint}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>成就</Text>
          <View style={styles.achievementGrid}>
            {achievements.map((achievement) => (
              <View
                key={achievement.key}
                style={[
                  styles.achievementCard,
                  achievement.unlocked ? styles.achievementUnlocked : styles.achievementLocked,
                ]}>
                <Text style={styles.achievementEmoji}>{achievement.emoji}</Text>
                <Text
                  style={[
                    styles.achievementTitle,
                    !achievement.unlocked && styles.achievementTitleLocked,
                  ]}>
                  {achievement.title}
                </Text>
                <Text style={styles.achievementDescription} numberOfLines={2}>
                  {achievement.description}
                </Text>
                <Text style={styles.achievementProgress}>
                  {Math.min(achievement.current, achievement.target)} / {achievement.target}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>照護小知識</Text>
          <View style={styles.educationList}>
            {EDUCATION_CARDS.map((card) => (
              <View key={card.key} style={styles.educationCard}>
                <Text style={styles.educationEmoji}>{card.emoji}</Text>
                <View style={styles.educationBody}>
                  <Text style={styles.educationTitle}>{card.title}</Text>
                  <Text style={styles.educationText}>{card.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#ffffff', flex: 1 },
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  content: { gap: 18, padding: 20, paddingBottom: 36 },
  hero: { gap: 6, paddingTop: 8 },
  heroEyebrow: {
    color: '#6c7a78',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: { color: '#171d1c', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  heroSubtitle: { color: '#3c4948', fontSize: 15, lineHeight: 22 },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: '#f0fdf9',
    borderColor: '#6ee7b7',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 18,
  },
  summaryMetric: { alignItems: 'center', flex: 1, gap: 4 },
  summaryDivider: { backgroundColor: '#ccefe0', height: 42, width: 1 },
  summaryValue: {
    color: '#065f46',
    fontSize: 30,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  summaryLabel: { color: '#3c4948', fontSize: 13, fontWeight: '600' },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#f5fbf9',
    borderColor: '#e3e9e8',
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 22,
  },
  emptyTitle: { color: '#171d1c', fontSize: 17, fontWeight: '700' },
  emptySubtitle: { color: '#6c7a78', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  section: { gap: 12 },
  sectionHeader: {
    color: '#6c7a78',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catalogCard: {
    backgroundColor: '#f5fbf9',
    borderColor: '#e3e9e8',
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    minHeight: 190,
    padding: 16,
    width: '48%',
  },
  catalogCardLocked: {
    alignItems: 'center',
    backgroundColor: '#fafcfb',
    justifyContent: 'center',
  },
  catalogTopRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  catalogEmoji: { fontSize: 28 },
  catalogEmojiLocked: { color: '#bbc9c7', fontSize: 24 },
  rarityPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  rarityText: { fontSize: 11, fontWeight: '700' },
  catalogTitle: { color: '#171d1c', fontSize: 16, fontWeight: '700' },
  catalogTitleLocked: { color: '#6c7a78', fontSize: 16, fontWeight: '700' },
  catalogDescription: { color: '#3c4948', fontSize: 14, lineHeight: 20 },
  catalogEducation: { color: '#6c7a78', fontSize: 13, lineHeight: 19 },
  catalogHint: { color: '#6c7a78', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  achievementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  achievementCard: {
    alignItems: 'center',
    borderRadius: 18,
    gap: 8,
    minHeight: 156,
    padding: 16,
    width: '48%',
  },
  achievementUnlocked: { backgroundColor: '#fff8e8', borderColor: '#f3d37f', borderWidth: 1 },
  achievementLocked: { backgroundColor: '#f7f8f8', borderColor: '#e3e9e8', borderWidth: 1 },
  achievementEmoji: { fontSize: 28 },
  achievementTitle: { color: '#171d1c', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  achievementTitleLocked: { color: '#6c7a78' },
  achievementDescription: { color: '#6c7a78', fontSize: 13, lineHeight: 18, textAlign: 'center' },
  achievementProgress: {
    color: '#3c4948',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  educationList: { gap: 10 },
  educationCard: {
    backgroundColor: '#f5fbf9',
    borderColor: '#e3e9e8',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  educationEmoji: { fontSize: 24, marginTop: 2 },
  educationBody: { flex: 1, gap: 4 },
  educationTitle: { color: '#171d1c', fontSize: 15, fontWeight: '700' },
  educationText: { color: '#3c4948', fontSize: 14, lineHeight: 20 },
});
