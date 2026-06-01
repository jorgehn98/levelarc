import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { Check, ChevronLeft, CircleAlert, Cpu, Download, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { MODEL_DISPLAY_NAME, formatModelSize, getModelFileDebugInfo, modelExists } from '@/ai/modelManager';
import { buildHabitContext, type HabitInsightInput } from '@/core/aiContext';
import { buildSystemContext } from '@/db/repository';
import { t, type Language } from '@/i18n';
import { confirmAction } from '@/lib/confirm';
import type { LlamaDiagnosticStep } from '@/ai/llamaEngine';
import { getLlmRuntimeError, useAiStore } from '@/stores/aiStore';
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
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<LlamaDiagnosticStep[] | null>(null);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [surfaceDiagnostics, setSurfaceDiagnostics] = useState<LlamaDiagnosticStep[] | null>(null);
  const [surfaceDiagnosticsRunning, setSurfaceDiagnosticsRunning] = useState(false);

  // Carga el perfil al montar si todavía no está listo (la pantalla puede abrirse sin pasar por el
  // chat, que es quien normalmente llama a loadAi).
  useEffect(() => {
    if (!isReady) void loadAi();
  }, [isReady, loadAi]);

  useEffect(() => {
    let active = true;
    void getLlmRuntimeError().then((error) => {
      if (active) setRuntimeError(error);
    });
    return () => {
      active = false;
    };
  }, [profile.engine, profile.modelStatus]);

  const isWeb = Platform.OS === 'web';
  const status = profile.modelStatus;
  const usingLlama = profile.engine === 'llama';
  const appVersion = Constants.expoConfig?.version ?? 'dev';
  const buildVersion = Constants.nativeBuildVersion ?? 'dev';
  const updateInfo = [
    `runtime ${Updates.runtimeVersion ?? 'dev'}`,
    `channel ${Updates.channel ?? 'n/a'}`,
    Updates.isEmbeddedLaunch ? 'embedded' : `update ${Updates.updateId ?? 'dev'}`,
  ].join(' · ');

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
    void (async () => {
      await setEngine(usingLlama ? 'template' : 'llama');
      if (!usingLlama) setRuntimeError(null);
    })();
  }

  function handleRunDiagnostics() {
    if (!profile.modelPath || diagnosticsRunning) return;
    void (async () => {
      setDiagnosticsRunning(true);
      setDiagnostics(null);
      try {
        const { runLlamaDiagnostics } = await import('@/ai/llamaEngine');
        const modelDebugInfo = getModelFileDebugInfo();
        setDiagnostics(
          await runLlamaDiagnostics(profile.modelPath!, {
            appVersion,
            buildVersion,
            runtimeVersion: Updates.runtimeVersion ?? 'dev',
            updateChannel: Updates.channel ?? 'n/a',
            updateId: Updates.updateId ?? 'embedded',
            launchSource: Updates.isEmbeddedLaunch ? 'embedded' : 'ota',
            platform: Platform.OS,
            engine: profile.engine,
            modelStatus: profile.modelStatus,
            enabled: profile.enabled,
            usingLlama,
            modelPath: profile.modelPath!,
            modelExists: modelExists(),
            modelSize: modelDebugInfo.modelSize,
            expectedModelSize: modelDebugInfo.expectedSize,
            stampExists: modelDebugInfo.stampExists,
            stampSize: modelDebugInfo.stampSize,
          }),
        );
      } catch (error) {
        const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        setDiagnostics([{ name: 'diagnostic bootstrap', status: 'error', detail, ms: 0 }]);
      } finally {
        setDiagnosticsRunning(false);
      }
    })();
  }

  function handleRunSurfaceDiagnostics() {
    if (!profile.modelPath || surfaceDiagnosticsRunning) return;
    void (async () => {
      setSurfaceDiagnosticsRunning(true);
      setSurfaceDiagnostics(null);
      try {
        const { runLlamaSurfaceDiagnostics } = await import('@/ai/llamaEngine');
        const systemContext = await buildSystemContext();
        const sampleHabit: HabitInsightInput = {
          nombre: 'Leer 30 minutos',
          consistency30: 0.42,
          currentStreak: 0,
          mejorRachaHabito: 6,
          importancia: 4,
          atributos: ['focus', 'discipline'],
          last7: ['fallado', 'pendiente', 'completado', 'fallado', 'pendiente', 'completado', 'pendiente'],
        };
        setSurfaceDiagnostics(
          await runLlamaSurfaceDiagnostics(profile.modelPath!, language, systemContext, buildHabitContext(sampleHabit)),
        );
      } catch (error) {
        const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        setSurfaceDiagnostics([{ name: 'surface diagnostic bootstrap', status: 'error', detail, ms: 0 }]);
      } finally {
        setSurfaceDiagnosticsRunning(false);
      }
    })();
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
        <Text style={styles.buildInfo}>LevelArc {appVersion} · build {buildVersion}</Text>
        <Text style={styles.updateInfo}>{updateInfo}</Text>

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
                diagnostics={diagnostics}
                diagnosticsRunning={diagnosticsRunning}
                language={language}
                onDelete={handleDelete}
                onRunDiagnostics={handleRunDiagnostics}
                onRunSurfaceDiagnostics={handleRunSurfaceDiagnostics}
                onToggleEngine={handleToggleEngine}
                hasModelPath={Boolean(profile.modelPath)}
                runtimeError={runtimeError}
                surfaceDiagnostics={surfaceDiagnostics}
                surfaceDiagnosticsRunning={surfaceDiagnosticsRunning}
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
  diagnostics,
  diagnosticsRunning,
  language,
  onDelete,
  onRunDiagnostics,
  onRunSurfaceDiagnostics,
  onToggleEngine,
  hasModelPath,
  runtimeError,
  surfaceDiagnostics,
  surfaceDiagnosticsRunning,
  usingLlama,
}: {
  diagnostics: LlamaDiagnosticStep[] | null;
  diagnosticsRunning: boolean;
  hasModelPath: boolean;
  language: Language;
  onDelete: () => void;
  onRunDiagnostics: () => void;
  onRunSurfaceDiagnostics: () => void;
  onToggleEngine: () => void;
  runtimeError: string | null;
  surfaceDiagnostics: LlamaDiagnosticStep[] | null;
  surfaceDiagnosticsRunning: boolean;
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

      {runtimeError ? (
        <View style={styles.runtimeNotice}>
          <CircleAlert color={colors.state.failed} size={16} />
          <View style={styles.runtimeNoticeCopy}>
            <Text style={styles.runtimeNoticeTitle}>{t(language, 'aiRuntimeDisabled')}</Text>
            <Text style={styles.runtimeNoticeText}>{t(language, 'aiRuntimeDisabledCopy')}</Text>
            <Text style={styles.runtimeError}>{runtimeError}</Text>
          </View>
        </View>
      ) : null}

      <Button
        disabled={diagnosticsRunning}
        icon={Cpu}
        label={diagnosticsRunning ? t(language, 'aiDiagnosticRunning') : t(language, 'aiRunDiagnostic')}
        onPress={onRunDiagnostics}
        variant="secondary"
      />

      {diagnostics ? <DiagnosticResult language={language} steps={diagnostics} /> : null}

      <Button
        disabled={surfaceDiagnosticsRunning || !usingLlama || !hasModelPath}
        icon={Cpu}
        label={
          surfaceDiagnosticsRunning ? t(language, 'aiSurfaceDiagnosticRunning') : t(language, 'aiRunSurfaceDiagnostic')
        }
        onPress={onRunSurfaceDiagnostics}
        variant="secondary"
      />

      {surfaceDiagnostics ? (
        <DiagnosticResult
          hintKey="aiSurfaceDiagnosticHint"
          language={language}
          steps={surfaceDiagnostics}
          titleKey="aiSurfaceDiagnosticTitle"
        />
      ) : null}

      <Button icon={Trash2} label={t(language, 'aiDeleteModel')} onPress={onDelete} variant="danger" />
    </View>
  );
}

function DiagnosticResult({
  hintKey = 'aiDiagnosticHint',
  language,
  steps,
  titleKey = 'aiDiagnosticTitle',
}: {
  hintKey?: 'aiDiagnosticHint' | 'aiSurfaceDiagnosticHint';
  language: Language;
  steps: LlamaDiagnosticStep[];
  titleKey?: 'aiDiagnosticTitle' | 'aiSurfaceDiagnosticTitle';
}) {
  return (
    <View style={styles.diagnosticCard}>
      <Text style={styles.diagnosticTitle}>{t(language, titleKey)}</Text>
      <Text style={styles.diagnosticHint}>{t(language, hintKey)}</Text>
      {steps.map((step) => (
        <View key={`${step.name}-${step.ms}`} style={styles.diagnosticStep}>
          <Text style={[styles.diagnosticStepName, step.status === 'error' && styles.diagnosticStepError]}>
            {step.status === 'ok' ? 'OK' : 'ERROR'} · {step.name} · {step.ms}ms
          </Text>
          <Text selectable style={styles.diagnosticStepDetail}>
            {step.detail}
          </Text>
        </View>
      ))}
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
  buildInfo: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    marginTop: -8,
    textTransform: 'uppercase',
  },
  updateInfo: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 11,
    marginTop: -12,
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
  runtimeNotice: {
    alignItems: 'flex-start',
    backgroundColor: `${colors.state.failed}12`,
    borderColor: `${colors.state.failed}66`,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  runtimeNoticeCopy: {
    flex: 1,
    minWidth: 0,
  },
  runtimeNoticeTitle: {
    color: colors.state.failed,
    fontFamily: typography.font.bodyMedium,
    fontSize: 13,
  },
  runtimeNoticeText: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  runtimeError: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyRegular,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  diagnosticCard: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  diagnosticTitle: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.bodyMedium,
    fontSize: 13,
  },
  diagnosticHint: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  diagnosticStep: {
    gap: 4,
  },
  diagnosticStepName: {
    color: colors.state.completed,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  diagnosticStepError: {
    color: colors.state.failed,
  },
  diagnosticStepDetail: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyRegular,
    fontSize: 11,
    lineHeight: 16,
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
