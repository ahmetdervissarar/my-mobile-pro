import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { markLegalNoticeSeen, useHasSeenLegalNotice, useIsLegalNoticeHydrated } from '../src/state/legalNoticeStore';
import { LegalNoticeModal } from '../src/ui/LegalNoticeModal';

export default function RootLayout() {
  const isLegalNoticeHydrated = useIsLegalNoticeHydrated();
  const hasSeenLegalNotice = useHasSeenLegalNotice();

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
      {/* İş 2 (görev onayı): kapalı beta + gizlilik metni ilk açılışta bir
          kez gösterilir. isLegalNoticeHydrated henüz okunmadıysa (AsyncStorage
          henüz yanıt vermedi) modal hiç yanıp sönmez — false kalır. */}
      <LegalNoticeModal
        visible={isLegalNoticeHydrated && !hasSeenLegalNotice}
        onClose={() => void markLegalNoticeSeen()}
        requireAcknowledgement
      />
    </SafeAreaProvider>
  );
}
