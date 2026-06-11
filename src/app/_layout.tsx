import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    'ClashDisplay-Medium': require('@/assets/fonts/ClashDisplay-Medium.ttf'),
    'ClashDisplay-Semibold': require('@/assets/fonts/ClashDisplay-Semibold.ttf'),
    'ClashDisplay-Bold': require('@/assets/fonts/ClashDisplay-Bold.ttf'),
    'Satoshi-Regular': require('@/assets/fonts/Satoshi-Regular.ttf'),
    'Satoshi-Medium': require('@/assets/fonts/Satoshi-Medium.ttf'),
    'Satoshi-Bold': require('@/assets/fonts/Satoshi-Bold.ttf'),
    'Satoshi-Black': require('@/assets/fonts/Satoshi-Black.ttf'),
    'Satoshi-Italic': require('@/assets/fonts/Satoshi-Italic.ttf'),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#f8f5ee' },
          animation: 'fade',
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="play-bots" />
        <Stack.Screen name="game" />
        <Stack.Screen name="how-to-play" options={{ presentation: 'modal' }} />
        <Stack.Screen name="result" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
    </>
  );
}
