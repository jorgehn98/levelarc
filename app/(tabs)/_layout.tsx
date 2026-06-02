import { Tabs } from 'expo-router';
import { ChartNoAxesColumnIncreasing, ListChecks, Settings, Target } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { useAppStore } from '@/stores/appStore';
import { colors, typography } from '@/theme/colors';

const iconSize = 22;

export default function TabsLayout() {
  const language = useAppStore((state) => state.language);
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.cyanCore,
        tabBarInactiveTintColor: colors.state.pending,
        tabBarStyle: {
          backgroundColor: colors.background.surface,
          borderTopColor: colors.background.border,
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: typography.font.bodyMedium,
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t(language, 'today'),
          tabBarIcon: ({ color }) => <Target color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: t(language, 'habits'),
          tabBarIcon: ({ color }) => <ListChecks color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t(language, 'progress'),
          tabBarIcon: ({ color }) => <ChartNoAxesColumnIncreasing color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t(language, 'settings'),
          tabBarIcon: ({ color }) => <Settings color={color} size={iconSize} />,
        }}
      />
    </Tabs>
  );
}
