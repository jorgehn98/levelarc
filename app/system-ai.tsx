import { router } from 'expo-router';
import { Check, ChevronLeft, CircleAlert, Cpu, Download, Trash2 } from 'lucide-react-native';
import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { MODEL_DISPLAY_NAME, formatModelSize } from '@/ai/modelManager';
import { t, type Language } from '@/i18n';
import { confirmAction } from '@/lib/confirm';
import { useAiStore } from '@/stores/aiStore';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, typography } from '@/theme/colors';

export default function SystemAiScreen() {
  const language = useAppStore((state) => state.language);
  const profile = useAiStore((state) => state.profile);
  const modelProgress = useAiStore((state) => state.modelProgress);
  const isReady = useAiStore((state) => state.isReady);
  const loadAi = useAiStore((state) => state.loadAi);
  const downloadModel = useAiStore((state) => state.downloadModel);
  const cancelDownload = useAiStore((state) => state.cancelDownload);
  const deleteModel = useAiStore((state) => state.deleteModel);
  const setEngine = useAiStore((state) => state.setEngine);

  // Carga el perfil al montar si todavía no está listo (la pantalla puede abrirse sin pasar por el
  // chat, que es quien normalmente llama a loadAi).
  useEffect(() => {
    if (!isReady) void loadAi();
  }, [isReady, loadAi]);

  const isWeb = Platform.OS === 'web';
  const status = profile.modelStatus;
  const usingLlama = profile.engine === 'llama';

  function handleDownload() {
    confirmAction({
      title: t(language, 'aiDownloadConfirmTitle'),
      message: t(language, 'aiDownloadConfirmCopy', {
        size: formatModelSize(language),
        model: MODEL_DISPLAY_NAME,
      }),
      cancelText: t(language, 'cancel'),
      confirmText: t(language, 'aiDownloadModel'),
      onConfirm: () => void downloadModel(),
    });
  }

  function handleDelete() {
    confirmAction({
      title: t(language, 'aiDeleteConfirmTitle'),
      message: t(language, 'aiDeleteConfirmCopy'),
      cancelText: t(language, 'cancel'),
      confirmText: t(language, 'aiDeleteModel'),
      destructive: true,
      onConfirm: () => void deleteModel(),
    });
  }

  function handleToggleEngine() {
    void setEngine(usingLlama ? 'template' : 'llama');
  }

  return (
    <Screen>
      <ScreenHeader
        action={
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft color={colors.brand.cyanCore} size={20} />
          </Pressable>
        }
        icon={Cpu}
        subtitle={t(language, 'aiManageSubtitle')}
        title={t(language, 'systemAiTitle')}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          {t(language, 'aiIntro', { size: formatModelSize(language), model: MODEL_DISPLAY_NAME })}
        </Text>

        {isWeb ? (
          <View style={styles.noticeCard}>
            <CircleAlert color={colors.state.pending} size={18} />
            <Text style={styles.noticeText}>{t(language, 'aiWebNotice')}</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {status === 'none' ? (
              <NoneState language={language} onDownload={handleDownload} />
            ) : status === 'downloading' ? (
              <DownloadingState language={language} onCancel={cancelDownload} progress={modelProgress} />
            ) : status === 'ready' ? (
              <ReadyState
                language={language}
                onDelete={handleDelete}
                onToggleEngine={handleToggleEngine}
                usingLlama={usingLlama}
              />
            ) : (
              <ErrorState language={language} onRetry={handleDownload} />
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function NoneState({ language, onDownload }: { language: Language; onDownload: () => void }) {
  return (
    <View style={styles.stateBlock}>
      <Text style={styles.stateCopy}>{t(language, 'aiNoneCopy')}</Text>
      <Button icon={Download} label={t(language, 'aiDownloadModel')} onPress={onDownload} />
    </View>
  );
}

function DownloadingState({
  language,
  onCancel,
  progress,
}: {
  language: Language;
  onCancel: () => void;
  progress: number;
}) {
  const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  return (
    <View style={styles.stateBlock}>
      <View style={styles.progressHeader}>
        <Text style={styles.stateLabel}>{t(language, 'aiDownloading')}</Text>
        <Text style={styles.percent}>{t(language, 'aiPercent', { pct: percent })}</Text>
      </View>
      <ProgressBar ratio={progress} />
      <Button label={t(language, 'cancel')} onPress={onCancel} variant="secondary" />
    </View>
  );
}

function ReadyState({
  language,
  onDelete,
  onToggleEngine,
  usingLlama,
}: {
  language: Language;
  onDelete: () => void;
  onToggleEngine: () => void;
  usingLlama: boolean;
}) {
  return (
    <View style={styles.stateBlock}>
      <View style={styles.readyRow}>
        <Check color={colors.state.completed} size={18} />
        <Text style={styles.readyText}>{t(language, 'aiModelReady')}</Text>
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleCopy}>
          <Text style={styles.toggleTitle}>{t(language, 'aiUseAdvanced')}</Text>
          <Text style={styles.toggleHint}>{t(language, 'aiUseAdvancedHint')}</Text>
        </View>
        <Toggle active={usingLlama} onPress={onToggleEngine} />
      </View>

      <Button icon={Trash2} label={t(language, 'aiDeleteModel')} onPress={onDelete} variant="danger" />
    </View>
  );
}

function ErrorState({ language, onRetry }: { language: Language; onRetry: () => void }) {
  return (
    <View style={styles.stateBlock}>
      <View style={styles.readyRow}>
        <CircleAlert color={colors.state.failed} size={18} />
        <Text style={styles.errorText}>{t(language, 'aiDownloadError')}</Text>
      </View>
      <Button icon={Download} label={t(language, 'aiRetry')} onPress={onRetry} />
    </View>
  );
}

function Toggle({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={[styles.toggle, active && styles.toggleActive]}
    >
      <View style={[styles.toggleKnob, active && styles.toggleKnobActive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: 16,
    paddingBottom: 28,
  },
  intro: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 16,
  },
  noticeCard: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  noticeText: {
    color: colors.state.pending,
    flex: 1,
    fontFamily: typography.font.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  stateBlock: {
    gap: 14,
  },
  stateCopy: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stateLabel: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  percent: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 16,
  },
  readyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  readyText: {
    color: colors.state.completed,
    fontFamily: typography.font.bodyMedium,
    fontSize: 15,
  },
  errorText: {
    color: colors.state.failed,
    flex: 1,
    fontFamily: typography.font.bodyMedium,
    fontSize: 14,
  },
  toggleRow: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  toggleCopy: {
    flex: 1,
    minWidth: 0,
  },
  toggleTitle: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 15,
  },
  toggleHint: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  toggle: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: 44,
  },
  toggleActive: {
    backgroundColor: `${colors.brand.cyanCore}22`,
    borderColor: colors.brand.cyanCore,
  },
  toggleKnob: {
    alignSelf: 'flex-start',
    backgroundColor: colors.state.pending,
    borderRadius: 999,
    height: 20,
    width: 20,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
    backgroundColor: colors.brand.cyanCore,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
});
