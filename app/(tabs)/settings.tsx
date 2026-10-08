import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import {
  Bell,
  ChevronLeft,
  Cpu,
  Download,
  Eye,
  FileText,
  Globe,
  Info,
  Mail,
  Moon,
  RefreshCw,
  Shield,
  Skull,
  Sparkles,
  Store,
  Terminal,
  Trophy,
  Upload,
  User,
  X,
  Zap,
} from 'lucide-react-native';
import type { LucideProps } from 'lucide-react-native';
import type { ComponentType, ReactNode } from 'react';
import { useEffect, useReducer } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { TimePickerField } from '@/components/TimePickerField';
import { t, type Language } from '@/i18n';
import { getAppVersionInfo, isInternalBuild } from '@/lib/buildInfo';
import { confirmAction, notify } from '@/lib/confirm';
import { CONTACT_EMAIL, getLegalUrl } from '@/lib/links';
import { requestNotificationPermissions } from '@/lib/notifications';
import { warnRemindersDisabled } from '@/lib/reminderNotice';
import { clearEndOfDayReminder, getEndOfDayReminderTime, saveEndOfDayReminder } from '@/lib/reminders';
import { useAiStore } from '@/stores/aiStore';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, typography } from '@/theme/colors';

const INTERJECTIONS_ENABLED_KEY = 'levelarc.interjectionsEnabled';

type SettingsState = {
  isNameOpen: boolean;
  isEndOfDayReminderOpen: boolean;
  playerName: string;
  endOfDayReminderTime: string | null;
  endOfDayReminderDraft: string | null;
  interjectionsEnabled: boolean;
  isCheckingUpdate: boolean;
};

type SettingsAction =
  | { type: 'setNameOpen'; value: boolean }
  | { type: 'setEndOfDayReminderOpen'; value: boolean }
  | { type: 'setPlayerName'; value: string }
  | { type: 'setEndOfDayReminderTime'; value: string | null }
  | { type: 'setEndOfDayReminderDraft'; value: string | null }
  | { type: 'setInterjectionsEnabled'; value: boolean }
  | { type: 'setCheckingUpdate'; value: boolean }
  | {
      type: 'loadPreferences';
      reminderTime: string | null;
      interjectionsEnabled: boolean;
    }
  | { type: 'clearEndOfDayReminder' }
  | { type: 'saveEndOfDayReminder'; value: string };

function createSettingsState(playerName: string): SettingsState {
  return {
    isNameOpen: false,
    isEndOfDayReminderOpen: false,
    playerName,
    endOfDayReminderTime: null,
    endOfDayReminderDraft: '21:30',
    interjectionsEnabled: true,
    isCheckingUpdate: false,
  };
}

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'setNameOpen':
      return { ...state, isNameOpen: action.value };
    case 'setEndOfDayReminderOpen':
      return { ...state, isEndOfDayReminderOpen: action.value };
    case 'setPlayerName':
      return { ...state, playerName: action.value };
    case 'setEndOfDayReminderTime':
      return { ...state, endOfDayReminderTime: action.value };
    case 'setEndOfDayReminderDraft':
      return { ...state, endOfDayReminderDraft: action.value };
    case 'setInterjectionsEnabled':
      return { ...state, interjectionsEnabled: action.value };
    case 'setCheckingUpdate':
      return { ...state, isCheckingUpdate: action.value };
    case 'loadPreferences':
      return {
        ...state,
        interjectionsEnabled: action.interjectionsEnabled,
        endOfDayReminderTime: action.reminderTime,
        endOfDayReminderDraft: action.reminderTime ?? state.endOfDayReminderDraft,
      };
    case 'clearEndOfDayReminder':
      return {
        ...state,
        endOfDayReminderTime: null,
        endOfDayReminderDraft: null,
        isEndOfDayReminderOpen: false,
      };
    case 'saveEndOfDayReminder':
      return {
        ...state,
        endOfDayReminderTime: action.value,
        endOfDayReminderDraft: action.value,
        isEndOfDayReminderOpen: false,
      };
  }
}

export default function SettingsScreen() {
  const language = useAppStore((state) => state.language);
  const player = useAppStore((state) => state.player);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setPlayerName = useAppStore((state) => state.setPlayerName);
  const exportBackup = useAppStore((state) => state.exportBackup);
  const pickBackup = useAppStore((state) => state.pickBackup);
  const importBackup = useAppStore((state) => state.importBackup);
  const closeToday = useAppStore((state) => state.closeToday);
  const resetAll = useAppStore((state) => state.resetAll);
  const setInterjectionsEnabled = useAiStore((store) => store.setInterjectionsEnabled);
  const [state, dispatch] = useReducer(settingsReducer, player?.nombre ?? '', createSettingsState);
  const {
    endOfDayReminderDraft,
    endOfDayReminderTime,
    isCheckingUpdate,
    isEndOfDayReminderOpen,
    interjectionsEnabled,
    isNameOpen,
    playerName,
  } = state;
  const appVersion = getAppVersionInfo();

  useEffect(() => {
    async function loadEndOfDayReminder() {
      const [storedTime, storedInterjections] = await Promise.all([
        getEndOfDayReminderTime(),
        AsyncStorage.getItem(INTERJECTIONS_ENABLED_KEY),
      ]);
      dispatch({
        type: 'loadPreferences',
        reminderTime: storedTime,
        interjectionsEnabled: storedInterjections !== 'false',
      });
    }

    // Si las preferencias no se pueden leer, la pantalla sigue con los valores por defecto.
    loadEndOfDayReminder().catch(() => undefined);
  }, []);

  // Los manejadores locales de esta pantalla (preferencias y recordatorio) no pasan por el store:
  // si fallan, avisan igual que una acción en vez de perderse en una promesa sin tratar.
  const guarded = (task: () => Promise<void>) => {
    task().catch(() => notify(t(language, 'actionFailed'), t(language, 'actionFailedCopy')));
  };

  // Primero se elige el fichero y después se confirma: hasta ese momento no se toca ningún dato. Si
  // la lectura o la importación fallan, el store ya explicó el motivo.
  const handleImportBackup = async () => {
    const rawBackup = await pickBackup();
    if (rawBackup === null) return;

    confirmAction({
      title: t(language, 'restoreConfirmTitle'),
      message: t(language, 'restoreConfirmCopy'),
      cancelText: t(language, 'cancel'),
      confirmText: t(language, 'restore'),
      destructive: true,
      onConfirm: () => {
        void (async () => {
          if (!(await importBackup(rawBackup))) return;
          notify(t(language, 'backupImported'), t(language, 'backupImportedCopy'));
        })();
      },
    });
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => notify(t(language, 'openLinkFailed'), t(language, 'openLinkFailedCopy', { url })));
  };

  const handleSaveName = async () => {
    if (!(await setPlayerName(playerName))) return;
    dispatch({ type: 'setNameOpen', value: false });
    notify(t(language, 'nameUpdated'), t(language, 'nameUpdatedCopy'));
  };

  const handleCheckForUpdates = async () => {
    dispatch({ type: 'setCheckingUpdate', value: true });
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        notify(t(language, 'appUpdated'), t(language, 'appUpdatedCopy'));
        return;
      }

      await Updates.fetchUpdateAsync();
      confirmAction({
        title: t(language, 'updateReady'),
        message: t(language, 'updateReadyCopy'),
        cancelText: t(language, 'later'),
        confirmText: t(language, 'restart'),
        onConfirm: () => void Updates.reloadAsync(),
      });
    } catch {
      notify(t(language, 'updateUnavailable'), t(language, 'updateUnavailableCopy'));
    } finally {
      dispatch({ type: 'setCheckingUpdate', value: false });
    }
  };

  const handleSaveEndOfDayReminder = async () => {
    const normalizedTime = endOfDayReminderDraft;
    if (!normalizedTime) {
      await handleDisableEndOfDayReminder();
      return;
    }

    // Solo se da por guardado si quedó programado: el interruptor nunca queda encendido sin aviso.
    const status = await saveEndOfDayReminder(normalizedTime, language);
    if (status === 'denied') {
      warnRemindersDisabled(language, 'notificationPermissionDeniedCopy');
      return;
    }
    if (status !== 'scheduled') {
      notify(t(language, 'reminderUnavailable'), t(language, 'reminderUnavailableCopy'));
      return;
    }

    dispatch({ type: 'saveEndOfDayReminder', value: normalizedTime });
    notify(t(language, 'reminderSaved'), t(language, 'reminderSavedCopy'));
  };

  const handleDisableEndOfDayReminder = async () => {
    await clearEndOfDayReminder();
    dispatch({ type: 'clearEndOfDayReminder' });
    notify(t(language, 'reminderDisabled'), t(language, 'reminderDisabledCopy'));
  };

  const handleToggleInterjections = async () => {
    const next = !interjectionsEnabled;
    dispatch({ type: 'setInterjectionsEnabled', value: next });
    // El store persiste la preferencia y actualiza su propio estado, que es lo que lee el guard de
    // triggerInterjection. Así el toggle queda sincronizado con la mecánica de apariciones.
    await setInterjectionsEnabled(next);
  };

  const handleResetAll = () => {
    confirmAction({
      title: t(language, 'resetAllConfirmTitle'),
      message: t(language, 'resetAllConfirmCopy'),
      cancelText: t(language, 'cancel'),
      confirmText: t(language, 'resetAll'),
      destructive: true,
      onConfirm: () => {
        void (async () => {
          // resetAll también borra el recordatorio de fin de día, y solo si el reinicio entró.
          if (!(await resetAll())) return;
          dispatch({ type: 'clearEndOfDayReminder' });
          notify(t(language, 'resetDone'), t(language, 'resetDoneCopy'));
          router.replace('/onboarding');
        })();
      },
    });
  };

  const handleCloseToday = () => {
    confirmAction({
      title: t(language, 'closeDayConfirmTitle'),
      message: t(language, 'closeDayConfirmCopy'),
      cancelText: t(language, 'cancel'),
      confirmText: t(language, 'closeDay'),
      destructive: true,
      onConfirm: () => void closeToday(),
    });
  };

  return (
    <Screen>
      <ScreenHeader icon={Shield} subtitle={t(language, 'settingsSubtitle')} title={t(language, 'settings')} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SettingsSection label={t(language, 'preferences')}>
          <SettingRow compact icon={Globe} title={t(language, 'language')} value={language === 'es' ? 'Español' : 'English'}>
            <View style={styles.segmentActions}>
              <Button
                accessibilityLabel={t(language, 'spanish')}
                label="ES"
                onPress={() => void setLanguage('es')}
                selected={language === 'es'}
                variant={language === 'es' ? 'primary' : 'secondary'}
              />
              <Button
                accessibilityLabel={t(language, 'english')}
                label="EN"
                onPress={() => void setLanguage('en')}
                selected={language === 'en'}
                variant={language === 'en' ? 'primary' : 'secondary'}
              />
            </View>
          </SettingRow>

          <SettingRow icon={User} title={t(language, 'playerName')} value={player?.nombre ?? t(language, 'unnamedPlayer')}>
            <View style={styles.inlineActions}>
              <Button
                label={t(language, 'changeName')}
                onPress={() => {
                  dispatch({ type: 'setPlayerName', value: player?.nombre ?? '' });
                  dispatch({ type: 'setNameOpen', value: true });
                }}
                variant="secondary"
              />
            </View>
          </SettingRow>

          <SettingRow compact icon={Moon} title={t(language, 'theme')} value={t(language, 'darkFixed')}>
            <Text style={styles.fixedValue}>{t(language, 'fixed').toUpperCase()}</Text>
          </SettingRow>

          <SettingRow compact icon={Bell} title={t(language, 'notifications')} value={t(language, 'endOfDayReminderCopy')}>
            <Toggle
              active={Boolean(endOfDayReminderTime)}
              hint={t(language, 'endOfDayReminderCopy')}
              label={t(language, 'endOfDayReminder')}
              onPress={() => {
                if (endOfDayReminderTime) {
                  guarded(handleDisableEndOfDayReminder);
                  return;
                }
                void requestNotificationPermissions(language).catch(() => undefined);
                dispatch({ type: 'setEndOfDayReminderDraft', value: '21:30' });
                dispatch({ type: 'setEndOfDayReminderOpen', value: true });
              }}
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection accent={colors.brand.cyanCore} label={t(language, 'system')}>
          <SettingRow compact icon={Cpu} title={t(language, 'interjectionsToggle')} value={t(language, 'interjectionsToggleCopy')}>
            <Toggle
              active={interjectionsEnabled}
              hint={t(language, 'interjectionsToggleCopy')}
              label={t(language, 'interjectionsToggle')}
              onPress={() => guarded(handleToggleInterjections)}
            />
          </SettingRow>

          <SettingRow icon={Terminal} title={t(language, 'systemChatTitle')} value={t(language, 'systemChatRowCopy')}>
            <View style={styles.inlineActions}>
              <Button icon={Terminal} label={t(language, 'open')} onPress={() => router.push('/system-chat')} variant="selected" />
            </View>
          </SettingRow>

          <SettingRow icon={Cpu} title={t(language, 'aiManageTitle')} value={t(language, 'aiManageRowCopy')}>
            <View style={styles.inlineActions}>
              <Button icon={Cpu} label={t(language, 'aiManageOpen')} onPress={() => router.push('/system-ai')} variant="selected" />
            </View>
          </SettingRow>

          <SettingRow icon={Store} title={t(language, 'systemShop')} value={t(language, 'shopRowCopy')}>
            <View style={styles.inlineActions}>
              <Button icon={Store} label={t(language, 'openShop')} onPress={() => router.push('/shop')} variant="selected" />
            </View>
          </SettingRow>

          <SettingRow icon={Trophy} title={t(language, 'achievements')} value={t(language, 'achievementsRowCopy')}>
            <View style={styles.inlineActions}>
              <Button icon={Trophy} label={t(language, 'achievements')} onPress={() => router.push('/achievements')} variant="selected" />
            </View>
          </SettingRow>
        </SettingsSection>

        <SettingsSection label={t(language, 'data')}>
          <SettingRow icon={Download} title={t(language, 'backup')} value={t(language, 'backupCopy')}>
            <View style={styles.inlineActions}>
              <Button icon={Download} label={t(language, 'export')} onPress={() => void exportBackup()} />
              <Button icon={Upload} label={t(language, 'import')} onPress={() => void handleImportBackup()} variant="secondary" />
            </View>
          </SettingRow>

          <SettingRow icon={RefreshCw} title={t(language, 'updates')} value={t(language, 'updatesCopy')}>
            <View style={styles.inlineActions}>
              <Button
                disabled={isCheckingUpdate}
                label={isCheckingUpdate ? t(language, 'checking') : t(language, 'checkUpdates')}
                onPress={() => void handleCheckForUpdates()}
                variant="secondary"
              />
            </View>
          </SettingRow>
        </SettingsSection>

        {/* Atajos de QA (ascenso falso, repetir la pantalla de inicio): nunca en un build de usuario. */}
        {isInternalBuild() ? (
          <SettingsSection accent={colors.brand.cyanCore} label={t(language, 'demo')}>
            <SettingRow icon={Sparkles} title={t(language, 'rankAscension')} value={t(language, 'rankAscensionCopy')}>
              <View style={styles.inlineActions}>
                <Button icon={Zap} label={t(language, 'viewAscension')} onPress={() => router.push('/rank-up')} variant="selected" />
              </View>
            </SettingRow>

            <SettingRow icon={Eye} title={t(language, 'startScreen')} value={t(language, 'startScreenCopy')}>
              <View style={styles.inlineActions}>
                <Button icon={ChevronLeft} label={t(language, 'goHome')} onPress={() => router.push('/onboarding')} variant="secondary" />
              </View>
            </SettingRow>
          </SettingsSection>
        ) : null}

        <SettingsSection accent={colors.state.failed} label={t(language, 'danger')}>
          <SettingRow icon={Skull} iconColor={colors.state.failed} title={t(language, 'closeDay')} value={t(language, 'closeDayCopy')}>
            <View style={styles.inlineActions}>
              <Button label={t(language, 'closeDay')} onPress={handleCloseToday} variant="danger" />
            </View>
          </SettingRow>

          <SettingRow icon={X} iconColor={colors.state.failed} title={t(language, 'resetAll')} value={t(language, 'resetAllCopy')}>
            <View style={styles.inlineActions}>
              <Button label={t(language, 'resetAll')} onPress={handleResetAll} variant="danger" />
            </View>
          </SettingRow>
        </SettingsSection>

        <SettingsSection label={t(language, 'about')}>
          <SettingRow compact icon={Info} title="LevelArc" value={t(language, 'appVersion', appVersion)} />

          <SettingRow icon={FileText} title={t(language, 'legal')} value={t(language, 'legalCopy')}>
            <View style={styles.inlineActions}>
              <Button
                accessibilityRole="link"
                label={t(language, 'privacyPolicy')}
                onPress={() => openLink(getLegalUrl(language, 'privacy'))}
                variant="secondary"
              />
              <Button
                accessibilityRole="link"
                label={t(language, 'termsOfUse')}
                onPress={() => openLink(getLegalUrl(language, 'terms'))}
                variant="secondary"
              />
            </View>
          </SettingRow>

          <SettingRow icon={Mail} title={t(language, 'contact')} value={t(language, 'contactCopy')}>
            <View style={styles.inlineActions}>
              <Button
                accessibilityRole="link"
                icon={Mail}
                label={CONTACT_EMAIL}
                onPress={() => openLink(`mailto:${CONTACT_EMAIL}`)}
                variant="secondary"
              />
            </View>
          </SettingRow>
        </SettingsSection>
      </ScrollView>

      <PlayerNameModal
        language={language}
        onCancel={() => dispatch({ type: 'setNameOpen', value: false })}
        onChange={(value) => dispatch({ type: 'setPlayerName', value: value.slice(0, 24) })}
        onSave={() => void handleSaveName()}
        playerName={playerName}
        visible={isNameOpen}
      />
      <EndOfDayReminderModal
        endOfDayReminderTime={endOfDayReminderTime}
        language={language}
        onCancel={() => dispatch({ type: 'setEndOfDayReminderOpen', value: false })}
        onChange={(value) => dispatch({ type: 'setEndOfDayReminderDraft', value })}
        onDisable={() => guarded(handleDisableEndOfDayReminder)}
        onSave={() => guarded(handleSaveEndOfDayReminder)}
        value={endOfDayReminderDraft}
        visible={isEndOfDayReminderOpen}
      />
    </Screen>
  );
}

function PlayerNameModal({
  language,
  onCancel,
  onChange,
  onSave,
  playerName,
  visible,
}: {
  language: Language;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  playerName: string;
  visible: boolean;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalPanel}>
          <Text style={styles.modalKicker}>◆ {t(language, 'systemLabel')}</Text>
          <Text style={styles.modalTitle}>{t(language, 'changeName')}</Text>
          <Text style={styles.modalCopy}>{t(language, 'nameHelp')}</Text>
          <TextInput
            accessibilityLabel={t(language, 'playerName')}
            autoCapitalize="words"
            cursorColor={colors.brand.cyanCore}
            maxLength={24}
            onChangeText={onChange}
            placeholder={t(language, 'playerNamePlaceholder')}
            placeholderTextColor={colors.state.pending}
            selectionColor={colors.brand.cyanShadow}
            style={styles.nameInput}
            value={playerName}
          />
          <View style={styles.modalActions}>
            <Button label={t(language, 'cancel')} onPress={onCancel} variant="secondary" />
            <Button
              disabled={playerName.trim().length < 2}
              label={t(language, 'saveName')}
              onPress={onSave}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EndOfDayReminderModal({
  endOfDayReminderTime,
  language,
  onCancel,
  onChange,
  onDisable,
  onSave,
  value,
  visible,
}: {
  endOfDayReminderTime: string | null;
  language: Language;
  onCancel: () => void;
  onChange: (value: string | null) => void;
  onDisable: () => void;
  onSave: () => void;
  value: string | null;
  visible: boolean;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalPanel}>
          <Text style={styles.modalKicker}>◆ {t(language, 'systemLabel')}</Text>
          <Text style={styles.modalTitle}>{t(language, 'endOfDayReminder')}</Text>
          <Text style={styles.modalCopy}>{t(language, 'endOfDayReminderCopy')}</Text>
          <TimePickerField
            cancelLabel={t(language, 'cancel')}
            clearLabel={t(language, 'clearTime')}
            confirmLabel={t(language, 'useTime')}
            help={t(language, 'reminderTimeHelp')}
            onChange={onChange}
            placeholder={t(language, 'noReminder')}
            systemLabel={t(language, 'systemLabel')}
            title={t(language, 'selectTime')}
            value={value}
          />
          <View style={styles.modalActions}>
            <Button label={t(language, 'cancel')} onPress={onCancel} variant="secondary" />
            {endOfDayReminderTime ? <Button label={t(language, 'disable')} onPress={onDisable} variant="ghost" /> : null}
            <Button label={t(language, 'saveReminder')} onPress={onSave} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SettingsSection({ children, label, accent }: { children: ReactNode; label: string; accent?: string }) {
  return (
    <View style={styles.section}>
      <SectionHeader accent={accent} label={label} />
      <View style={styles.sectionPanel}>{children}</View>
    </View>
  );
}

function SettingRow({
  children,
  compact,
  icon: Icon,
  iconColor = colors.brand.cyanCore,
  title,
  value,
}: {
  children?: ReactNode;
  compact?: boolean;
  icon: ComponentType<LucideProps>;
  iconColor?: string;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={styles.iconTile}>
          <Icon color={iconColor} size={17} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowValue}>{value}</Text>
        </View>
        {compact && children ? <View style={styles.rowTrailing}>{children}</View> : null}
      </View>
      {!compact && children ? <View style={styles.rowActions}>{children}</View> : null}
    </View>
  );
}

function Toggle({ active, hint, label, onPress }: { active: boolean; hint: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      hitSlop={TOGGLE_HIT_SLOP}
      onPress={onPress}
      style={[styles.toggle, active && styles.toggleActive]}
    >
      <View style={[styles.toggleKnob, active && styles.toggleKnobActive]} />
    </Pressable>
  );
}

// El interruptor mide 44×28 pt: el hitSlop lo lleva al mínimo táctil de 44 pt de alto.
const TOGGLE_HIT_SLOP = { top: 8, bottom: 8 };

const styles = StyleSheet.create({
  scroll: {
    gap: 20,
    paddingBottom: 28,
  },
  section: {
    gap: 8,
  },
  sectionPanel: {
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    borderBottomColor: colors.background.border,
    borderBottomWidth: 1,
    padding: 14,
  },
  rowTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconTile: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 15,
  },
  rowValue: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  rowActions: {
    marginTop: 12,
    marginLeft: 46,
  },
  rowTrailing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segmentActions: {
    flexDirection: 'row',
    gap: 6,
  },
  fixedValue: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
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
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(5, 5, 9, 0.78)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalPanel: {
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 16,
    width: '100%',
  },
  modalKicker: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
  },
  modalTitle: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 20,
    marginTop: 4,
  },
  modalCopy: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  nameInput: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.brand.bone,
    fontFamily: typography.font.displayMedium,
    fontSize: 16,
    height: 48,
    marginTop: 14,
    paddingHorizontal: 12,
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 14,
  },
});
