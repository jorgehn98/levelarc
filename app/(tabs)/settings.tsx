import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  Bell,
  ChevronLeft,
  Download,
  Eye,
  Globe,
  Info,
  Moon,
  Music,
  RefreshCw,
  Shield,
  Skull,
  Snowflake,
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
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { TimePickerField } from '@/components/TimePickerField';
import { t, type Language } from '@/i18n';
import {
  cancelEndOfDayReminder,
  requestNotificationPermissions,
  scheduleEndOfDayReminder,
} from '@/lib/notifications';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, typography } from '@/theme/colors';

const END_OF_DAY_REMINDER_TIME_KEY = 'levelarc.endOfDayReminderTime';
const END_OF_DAY_REMINDER_ID_KEY = 'levelarc.endOfDayReminderNotificationId';
const VIBRATION_KEY = 'levelarc.settings.vibration';
const SOUND_KEY = 'levelarc.settings.sound';
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.2';

async function clearEndOfDayReminder() {
  const existingId = await AsyncStorage.getItem(END_OF_DAY_REMINDER_ID_KEY);
  await Promise.all([
    cancelEndOfDayReminder(existingId),
    AsyncStorage.multiRemove([END_OF_DAY_REMINDER_TIME_KEY, END_OF_DAY_REMINDER_ID_KEY]),
  ]);
}

type SettingsState = {
  isImportOpen: boolean;
  isNameOpen: boolean;
  isEndOfDayReminderOpen: boolean;
  backupJson: string;
  playerName: string;
  endOfDayReminderTime: string | null;
  endOfDayReminderDraft: string | null;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  isCheckingUpdate: boolean;
};

type SettingsAction =
  | { type: 'setImportOpen'; value: boolean }
  | { type: 'setNameOpen'; value: boolean }
  | { type: 'setEndOfDayReminderOpen'; value: boolean }
  | { type: 'setBackupJson'; value: string }
  | { type: 'setPlayerName'; value: string }
  | { type: 'setEndOfDayReminderTime'; value: string | null }
  | { type: 'setEndOfDayReminderDraft'; value: string | null }
  | { type: 'setVibrationEnabled'; value: boolean }
  | { type: 'setSoundEnabled'; value: boolean }
  | { type: 'setCheckingUpdate'; value: boolean }
  | { type: 'loadPreferences'; reminderTime: string | null; vibrationEnabled: boolean; soundEnabled: boolean }
  | { type: 'clearEndOfDayReminder' }
  | { type: 'saveEndOfDayReminder'; value: string };

function createSettingsState(playerName: string): SettingsState {
  return {
    isImportOpen: false,
    isNameOpen: false,
    isEndOfDayReminderOpen: false,
    backupJson: '',
    playerName,
    endOfDayReminderTime: null,
    endOfDayReminderDraft: '21:30',
    vibrationEnabled: true,
    soundEnabled: false,
    isCheckingUpdate: false,
  };
}

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'setImportOpen':
      return { ...state, isImportOpen: action.value };
    case 'setNameOpen':
      return { ...state, isNameOpen: action.value };
    case 'setEndOfDayReminderOpen':
      return { ...state, isEndOfDayReminderOpen: action.value };
    case 'setBackupJson':
      return { ...state, backupJson: action.value };
    case 'setPlayerName':
      return { ...state, playerName: action.value };
    case 'setEndOfDayReminderTime':
      return { ...state, endOfDayReminderTime: action.value };
    case 'setEndOfDayReminderDraft':
      return { ...state, endOfDayReminderDraft: action.value };
    case 'setVibrationEnabled':
      return { ...state, vibrationEnabled: action.value };
    case 'setSoundEnabled':
      return { ...state, soundEnabled: action.value };
    case 'setCheckingUpdate':
      return { ...state, isCheckingUpdate: action.value };
    case 'loadPreferences':
      return {
        ...state,
        vibrationEnabled: action.vibrationEnabled,
        soundEnabled: action.soundEnabled,
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
  const importBackup = useAppStore((state) => state.importBackup);
  const closeToday = useAppStore((state) => state.closeToday);
  const resetAll = useAppStore((state) => state.resetAll);
  const [state, dispatch] = useReducer(settingsReducer, player?.nombre ?? '', createSettingsState);
  const {
    backupJson,
    endOfDayReminderDraft,
    endOfDayReminderTime,
    isCheckingUpdate,
    isEndOfDayReminderOpen,
    isImportOpen,
    isNameOpen,
    playerName,
    soundEnabled,
    vibrationEnabled,
  } = state;

  useEffect(() => {
    async function loadEndOfDayReminder() {
      const [storedTime, storedVibration, storedSound] = await Promise.all([
        AsyncStorage.getItem(END_OF_DAY_REMINDER_TIME_KEY),
        AsyncStorage.getItem(VIBRATION_KEY),
        AsyncStorage.getItem(SOUND_KEY),
      ]);
      dispatch({
        type: 'loadPreferences',
        reminderTime: storedTime,
        vibrationEnabled: storedVibration !== 'false',
        soundEnabled: storedSound === 'true',
      });
    }

    void loadEndOfDayReminder();
  }, []);

  const handleImportBackup = () => {
    Alert.alert(t(language, 'restoreConfirmTitle'), t(language, 'restoreConfirmCopy'), [
      { text: t(language, 'cancel'), style: 'cancel' },
      {
        text: t(language, 'restore'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await importBackup(backupJson);
            dispatch({ type: 'setBackupJson', value: '' });
            dispatch({ type: 'setImportOpen', value: false });
            Alert.alert(t(language, 'backupImported'), t(language, 'backupImportedCopy'));
          })();
        },
      },
    ]);
  };

  const handleSaveName = async () => {
    await setPlayerName(playerName);
    dispatch({ type: 'setNameOpen', value: false });
    Alert.alert(t(language, 'nameUpdated'), t(language, 'nameUpdatedCopy'));
  };

  const handleCheckForUpdates = async () => {
    dispatch({ type: 'setCheckingUpdate', value: true });
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        Alert.alert(t(language, 'appUpdated'), t(language, 'appUpdatedCopy'));
        return;
      }

      await Updates.fetchUpdateAsync();
      Alert.alert(t(language, 'updateReady'), t(language, 'updateReadyCopy'), [
        { text: t(language, 'later'), style: 'cancel' },
        { text: t(language, 'restart'), onPress: () => void Updates.reloadAsync() },
      ]);
    } catch {
      Alert.alert(t(language, 'updateUnavailable'), t(language, 'updateUnavailableCopy'));
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

    const existingId = await AsyncStorage.getItem(END_OF_DAY_REMINDER_ID_KEY);
    const [, notificationId] = await Promise.all([
      cancelEndOfDayReminder(existingId),
      scheduleEndOfDayReminder(
        normalizedTime,
        t(language, 'endOfDayNotificationTitle'),
        t(language, 'endOfDayNotificationBody'),
      ),
    ]);

    if (!notificationId) {
      Alert.alert(t(language, 'notificationPermissionDenied'), t(language, 'notificationPermissionDeniedCopy'));
      return;
    }

    await AsyncStorage.multiSet([
      [END_OF_DAY_REMINDER_TIME_KEY, normalizedTime],
      [END_OF_DAY_REMINDER_ID_KEY, notificationId],
    ]);
    dispatch({ type: 'saveEndOfDayReminder', value: normalizedTime });
    Alert.alert(t(language, 'reminderSaved'), t(language, 'reminderSavedCopy'));
  };

  const handleDisableEndOfDayReminder = async () => {
    await clearEndOfDayReminder();
    dispatch({ type: 'clearEndOfDayReminder' });
    Alert.alert(t(language, 'reminderDisabled'), t(language, 'reminderDisabledCopy'));
  };

  const handleToggleVibration = async () => {
    const next = !vibrationEnabled;
    dispatch({ type: 'setVibrationEnabled', value: next });
    await AsyncStorage.setItem(VIBRATION_KEY, String(next));
  };

  const handleToggleSound = async () => {
    const next = !soundEnabled;
    dispatch({ type: 'setSoundEnabled', value: next });
    await AsyncStorage.setItem(SOUND_KEY, String(next));
  };

  const handleResetAll = () => {
    Alert.alert(t(language, 'resetAllConfirmTitle'), t(language, 'resetAllConfirmCopy'), [
      { text: t(language, 'cancel'), style: 'cancel' },
      {
        text: t(language, 'resetAll'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await clearEndOfDayReminder();
            dispatch({ type: 'clearEndOfDayReminder' });
            await resetAll();
            Alert.alert(t(language, 'resetDone'), t(language, 'resetDoneCopy'));
            router.replace('/onboarding');
          })();
        },
      },
    ]);
  };

  const handleCloseToday = () => {
    Alert.alert(t(language, 'closeDayConfirmTitle'), t(language, 'closeDayConfirmCopy'), [
      { text: t(language, 'cancel'), style: 'cancel' },
      { text: t(language, 'closeDay'), style: 'destructive', onPress: () => void closeToday() },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader icon={Shield} subtitle={t(language, 'settingsSubtitle')} title={t(language, 'settings')} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SettingsSection label={t(language, 'preferences')}>
          <SettingRow compact icon={Globe} title={t(language, 'language')} value={language === 'es' ? 'Español' : 'English'}>
            <View style={styles.segmentActions}>
              <Button label="ES" onPress={() => void setLanguage('es')} variant={language === 'es' ? 'primary' : 'secondary'} />
              <Button label="EN" onPress={() => void setLanguage('en')} variant={language === 'en' ? 'primary' : 'secondary'} />
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
              onPress={() => {
                if (endOfDayReminderTime) {
                  void handleDisableEndOfDayReminder();
                  return;
                }
                void requestNotificationPermissions();
                dispatch({ type: 'setEndOfDayReminderDraft', value: '21:30' });
                dispatch({ type: 'setEndOfDayReminderOpen', value: true });
              }}
            />
          </SettingRow>

          <SettingRow compact icon={Snowflake} title={t(language, 'vibration')} value={t(language, 'vibrationCopy')}>
            <Toggle active={vibrationEnabled} onPress={() => void handleToggleVibration()} />
          </SettingRow>

          <SettingRow compact icon={Music} title={t(language, 'sound')} value={t(language, 'soundCopy')}>
            <Toggle active={soundEnabled} onPress={() => void handleToggleSound()} />
          </SettingRow>
        </SettingsSection>

        <SettingsSection accent={colors.brand.cyanCore} label={t(language, 'system')}>
          <SettingRow icon={Terminal} title={t(language, 'systemChatTitle')} value={t(language, 'systemChatRowCopy')}>
            <View style={styles.inlineActions}>
              <Button icon={Terminal} label={t(language, 'open')} onPress={() => router.push('/system-chat')} variant="selected" />
            </View>
          </SettingRow>

          <SettingRow compact icon={Info} iconColor={colors.state.pending} title={t(language, 'systemChatEngineLabel')} value={t(language, 'systemChatEngineNote')} />

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
              <Button icon={Upload} label={t(language, 'import')} onPress={() => dispatch({ type: 'setImportOpen', value: true })} variant="secondary" />
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
          <SettingRow compact icon={Info} iconColor={colors.state.pending} title={`LevelArc ${APP_VERSION}`} value={t(language, 'versionLine')} />
        </SettingsSection>
      </ScrollView>

      <ImportBackupModal
        backupJson={backupJson}
        language={language}
        onCancel={() => dispatch({ type: 'setImportOpen', value: false })}
        onChange={(value) => dispatch({ type: 'setBackupJson', value })}
        onRestore={handleImportBackup}
        visible={isImportOpen}
      />
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
        onDisable={() => void handleDisableEndOfDayReminder()}
        onSave={() => void handleSaveEndOfDayReminder()}
        value={endOfDayReminderDraft}
        visible={isEndOfDayReminderOpen}
      />
    </Screen>
  );
}

function ImportBackupModal({
  backupJson,
  language,
  onCancel,
  onChange,
  onRestore,
  visible,
}: {
  backupJson: string;
  language: Language;
  onCancel: () => void;
  onChange: (value: string) => void;
  onRestore: () => void;
  visible: boolean;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalPanel}>
          <Text style={styles.modalKicker}>◆ {t(language, 'systemLabel')}</Text>
          <Text style={styles.modalTitle}>{t(language, 'importBackup')}</Text>
          <Text style={styles.modalCopy}>{t(language, 'importBackupCopy')}</Text>
          <TextInput
            multiline
            cursorColor={colors.brand.cyanCore}
            onChangeText={onChange}
            placeholder={t(language, 'pasteBackupJson')}
            placeholderTextColor={colors.state.pending}
            selectionColor={colors.brand.cyanShadow}
            style={styles.backupInput}
            textAlignVertical="top"
            value={backupJson}
          />
          <View style={styles.modalActions}>
            <Button label={t(language, 'cancel')} onPress={onCancel} variant="secondary" />
            <Button
              disabled={!backupJson.trim()}
              label={t(language, 'restore')}
              onPress={onRestore}
              variant={backupJson.trim() ? 'primary' : 'secondary'}
            />
          </View>
        </View>
      </View>
    </Modal>
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
              variant={playerName.trim().length >= 2 ? 'primary' : 'secondary'}
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
  backupInput: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.brand.bone,
    fontFamily: typography.font.bodyRegular,
    fontSize: 13,
    marginTop: 14,
    minHeight: 180,
    padding: 12,
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
