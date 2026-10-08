import { RefreshCw, TriangleAlert } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { t, type Language } from '@/i18n';
import { isInternalBuild } from '@/lib/buildInfo';
import { colors, radii, typography } from '@/theme/colors';

type SystemErrorScreenProps = {
  language: Language;
  title: string;
  message: string;
  // Detalle técnico: solo se enseña en builds internos.
  detail?: string;
  onRetry: () => void;
};

// Pantalla completa para cuando la app no puede seguir: fallo de arranque o error de render.
export function SystemErrorScreen({ language, title, message, detail, onRetry }: SystemErrorScreenProps) {
  return (
    <Screen>
      <View style={styles.content}>
        <View accessibilityRole="alert" style={styles.panel}>
          <View style={styles.icon}>
            <TriangleAlert color={colors.state.failed} size={22} />
          </View>
          <Text style={styles.kicker}>◆ {t(language, 'systemLabel')}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {detail && isInternalBuild() ? (
            <Text numberOfLines={4} style={styles.detail}>
              {detail}
            </Text>
          ) : null}
        </View>
        <Button icon={RefreshCw} label={t(language, 'retry')} onPress={onRetry} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 16,
    justifyContent: 'center',
  },
  panel: {
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  icon: {
    alignItems: 'center',
    borderColor: colors.state.failed,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginBottom: 4,
    width: 44,
  },
  kicker: {
    color: colors.state.failed,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
  },
  title: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 20,
    lineHeight: 26,
  },
  message: {
    color: colors.brand.boneMuted,
    fontFamily: typography.font.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
  },
  detail: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
});
