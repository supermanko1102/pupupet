import { Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppleSignInCard } from '@/components/apple-sign-in-card';
import { Fonts } from '@/constants/theme';
import { useSession } from '@/providers/session-provider';

export default function SignInScreen() {
  const { isReady, user } = useSession();

  if (isReady && user) {
    return <Redirect href="/" />;
  }

  return (
    <LinearGradient
      colors={['rgba(32, 178, 170, 0.2)', '#f5fafa', 'rgba(197, 234, 233, 0.4)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}>
      <StatusBar style="dark" />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.logoGroup}>
              <Text style={styles.brand}>PupuPet</Text>
              <Text style={styles.brandCn}>口袋便便</Text>
            </View>
            <AppleSignInCard />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  brand: {
    color: '#20B2AA',
    fontFamily: Fonts.rounded,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 44,
    textAlign: 'center',
  },
  brandCn: {
    color: 'rgba(60, 73, 72, 0.6)',
    fontFamily: Fonts.sans,
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 4.8,
    lineHeight: 24,
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  logoGroup: {
    alignItems: 'center',
    marginBottom: 48,
  },
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
});
