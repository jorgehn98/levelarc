import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  Upload,
  User,
  X,
  Zap,
} from 'lucide-react-native';
import type { LucideProps } from 'lucide-react-native';
import type { ComponentType, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { TimePickerField } from '@/components/TimePickerField';
import { t } from '@/i18n';
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

export default function SettingsScreen() {
  const language = useAppStore((state) => state.language);
  const player = useAppStore((state) => state.player);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setPlayerName = useAppStore((state) => state.setPlayerName);
  const exportBackup = useAppStore((state) => state.exportBackup);
  const importBackup = useAppStore((state) => state.importBackup);
  const closeToday = useAppStore((state) => state.closeToday);
  const resetAll = useAppStore((state) => state.resetAll);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNameOpen, setIsNameOpen] = useState(false);
  const [isEndOfDayReminderOpen, setIsEndOfDayReminderOpen] = useState(false);
  const [backupJson, setBackupJson] = useState('');
  const [playerName, setPlayerNameInput] = useState(player?.nombre ?? '');
  const [endOfDayReminderTime, setEndOfDayReminderTime] = useState<string | null>(null);
  const [endOfDayReminderDraft, setEndOfDayReminderDraft] = useState<string | null>('21:30');
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  useEffect(() => {
    async function loadEndOfDayReminder() {
      const [storedTime, storedVibration, storedSound] = await Promise.all([
        AsyncStorage.getItem(END_OF_DAY_REMINDER_TIME_KEY),
        AsyncStorage.getItem(VIBRATION_KEY),
        AsyncStorage.getItem(SOUND_KEY),
      ]);
      setVibrationEnabled(storedVibration !== 'false');
      setSoundEnabled(storedSound === 'true');
      if (!storedTime) return;
      setEndOfDayReminderTime(storedTime);
      setEndOfDayReminderDraft(storedTime);
    }

    void loadEndOfDayReminder();
  }, []);

  const handleImportBackup = async () => {
    await importBackup(backupJson);
    setBackupJson('');
    setIsImportOpen(false);
    Alert.alert(t(language, 'backupImported'), t(language, 'backupImportedCopy'));
  };

  const handleSaveName = async () => {
    await setPlayerName(playerName);
    setIsNameOpen(false);
    Alert.alert(t(language, 'nameUpdated'), t(language, 'nameUpdatedCopy'));
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
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
      setIsCheckingUpdate(false);
    }
  };

  const handleSaveEndOfDayReminder = async () => {
    const normalizedTime = endOfDayReminderDraft;
    if (!normalizedTime) {
      await handleDisableEndOfDayReminder();
      return;
    }

    const existingId = await AsyncStorage.getItem(END_OF_DAY_REMINDER_ID_KEY);
    await cancelEndOfDayReminder(existingId);
    const notificationId = await scheduleEndOfDayReminder(
      normalizedTime,
      t(language, 'endOfDayNotificationTitle'),
      t(language, 'endOfDayNotificationBody'),
    );

    if (!notificationId) {
      Alert.alert(t(language, 'notificationPermissionDenied'), t(language, 'notificationPermissionDeniedCopy'));
      return;
    }

    await AsyncStorage.multiSet([
      [END_OF_DAY_REMINDER_TIME_KEY, normalizedTime],
      [END_OF_DAY_REMINDER_ID_KEY, notificationId],
    ]);
    setEndOfDayReminderTime(normalizedTime);
    setEndOfDayReminderDraft(normalizedTime);
    setIsEndOfDayReminderOpen(false);
    Alert.alert(t(language, 'reminderSaved'), t(language, 'reminderSavedCopy'));
  };

  const handleDisableEndOfDayReminder = async () => {
    const existingId = await AsyncStorage.getItem(END_OF_DAY_REMINDER_ID_KEY);
    await cancelEndOfDayReminder(existingId);
    await AsyncStorage.multiRemove([END_OF_DAY_REMINDER_TIME_KEY, END_OF_DAY_REMINDER_ID_KEY]);
    setEndOfDayReminderTime(null);
    setEndOfDayReminderDraft(null);
    setIsEndOfDayReminderOpen(false);
    Alert.alert(t(language, 'reminderDisabled'), t(language, 'reminderDisabledCopy'));
  };

  const handleToggleVibration = async () => {
    const next = !vibrationEnabled;
    setVibrationEnabled(next);
    await AsyncStorage.setItem(VIBRATION_KEY, String(next));
  };

  const handleToggleSound = async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
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
            const existingId = await AsyncStorage.getItem(END_OF_DAY_REMINDER_ID_KEY);
            await cancelEndOfDayReminder(existingId);
            await AsyncStorage.multiRemove([END_OF_DAY_REMINDER_TIME_KEY, END_OF_DAY_REMINDER_ID_KEY]);
            setEndOfDayReminderTime(null);
            setEndOfDayReminderDraft(null);
            await resetAll();
            Alert.alert(t(language, 'resetDone'), t(language, 'resetDoneCopy'));
            router.replace('/onboarding');
          })();
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader icon={Shield} subtitle="Configuración · Sistema" title={t(language, 'settings')} />
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
                  setPlayerNameInput(player?.nombre ?? '');
                  setIsNameOpen(true);
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
                setEndOfDayReminderDraft('21:30');
                setIsEndOfDayReminderOpen(true);
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

        <SettingsSection label={t(language, 'data')}>
          <SettingRow icon={Download} title={t(language, 'backup')} value={t(language, 'backupCopy')}>
            <View style={styles.inlineActions}>
              <Button icon={Download} label={t(language, 'export')} onPress={() => void exportBackup()} />
              <Button icon={Upload} label={t(language, 'import')} onPress={() => setIsImportOpen(true)} variant="secondary" />
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
              <Button label={t(language, 'closeDay')} onPress={() => void closeToday()} variant="danger" />
            </View>
          </SettingRow>

          <SettingRow icon={X} iconColor={colors.state.failed} title={t(language, 'resetAll')} value={t(language, 'resetAllCopy')}>
            <View style={styles.inlineActions}>
              <Button label={t(language, 'resetAll')} onPress={handleResetAll} variant="danger" />
            </View>
          </SettingRow>
        </SettingsSection>

        <SettingsSection label={t(language, 'about')}>
          <SettingRow compact icon={Info} iconColor={colors.state.pending} title="LevelArc 1.0.0" value={t(language, 'versionLine')} />
        </SettingsSection>
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setIsImportOpen(false)} transparent visible={isImportOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <Text style={styles.modalKicker}>◆ SISTEMA</Text>
            <Text style={styles.modalTitle}>{t(language, 'importBackup')}</Text>
            <Text style={styles.modalCopy}>{t(language, 'importBackupCopy')}</Text>
            <TextInput
              multiline
              cursorColor={colors.brand.cyanCore}
              onChangeText={setBackupJson}
              placeholder={t(language, 'pasteBackupJson')}
              placeholderTextColor={colors.state.pending}
              selectionColor={colors.brand.cyanShadow}
              style={styles.backupInput}
              textAlignVertical="top"
              value={backupJson}
            />
            <View style={styles.modalActions}>
              <Button label={t(language, 'cancel')} onPress={() => setIsImportOpen(false)} variant="secondary" />
              <Button
                disabled={!backupJson.trim()}
                label={t(language, 'restore')}
                onPress={() => void handleImportBackup()}
                variant={backupJson.trim() ? 'primary' : 'secondary'}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" onRequestClose={() => setIsNameOpen(false)} transparent visible={isNameOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <Text style={styles.modalKicker}>◆ SISTEMA</Text>
            <Text style={styles.modalTitle}>{t(language, 'changeName')}</Text>
            <Text style={styles.modalCopy}>{t(language, 'nameHelp')}</Text>
            <TextInput
              autoCapitalize="words"
              cursorColor={colors.brand.cyanCore}
              maxLength={24}
              onChangeText={(value) => setPlayerNameInput(value.slice(0, 24))}
              placeholder={t(language, 'playerNamePlaceholder')}
              placeholderTextColor={colors.state.pending}
              selectionColor={colors.brand.cyanShadow}
              style={styles.nameInput}
              value={playerName}
            />
            <View style={styles.modalActions}>
              <Button label={t(language, 'cancel')} onPress={() => setIsNameOpen(false)} variant="secondary" />
              <Button
                disabled={playerName.trim().length < 2}
                label={t(language, 'saveName')}
                onPress={() => void handleSaveName()}
                variant={playerName.trim().length >= 2 ? 'primary' : 'secondary'}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" onRequestClose={() => setIsEndOfDayReminderOpen(false)} transparent visible={isEndOfDayReminderOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <Text style={styles.modalKicker}>◆ SISTEMA</Text>
            <Text style={styles.modalTitle}>{t(language, 'endOfDayReminder')}</Text>
            <Text style={styles.modalCopy}>{t(language, 'endOfDayReminderCopy')}</Text>
            <TimePickerField
              cancelLabel={t(language, 'cancel')}
              clearLabel={t(language, 'clearTime')}
              confirmLabel={t(language, 'useTime')}
              help={t(language, 'reminderTimeHelp')}
              onChange={setEndOfDayReminderDraft}
              placeholder={t(language, 'noReminder')}
              title={t(language, 'selectTime')}
              value={endOfDayReminderDraft}
            />
            <View style={styles.modalActions}>
              <Button label={t(language, 'cancel')} onPress={() => setIsEndOfDayReminderOpen(false)} variant="secondary" />
              {endOfDayReminderTime ? (
                <Button label={t(language, 'disable')} onPress={() => void handleDisableEndOfDayReminder()} variant="ghost" />
              ) : null}
              <Button label={t(language, 'saveReminder')} onPress={() => void handleSaveEndOfDayReminder()} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
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
