import { Bell, Download, Languages, Moon, RefreshCw, Skull, Upload } from 'lucide-react-native';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import * as Updates from 'expo-updates';

import { Button } from '@/components/Button';
import { t } from '@/i18n';
import { Screen } from '@/components/Screen';
import { requestNotificationPermissions } from '@/lib/notifications';
import { useAppStore } from '@/stores/appStore';
import { colors } from '@/theme/colors';

export default function SettingsScreen() {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const exportBackup = useAppStore((state) => state.exportBackup);
  const importBackup = useAppStore((state) => state.importBackup);
  const closeToday = useAppStore((state) => state.closeToday);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [backupJson, setBackupJson] = useState('');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const handleImportBackup = async () => {
    await importBackup(backupJson);
    setBackupJson('');
    setIsImportOpen(false);
    Alert.alert(t(language, 'backupImported'), t(language, 'backupImportedCopy'));
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

  return (
    <Screen>
      <Text style={styles.title}>{t(language, 'settings')}</Text>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.row}>
          <Languages color={colors.brand.cyanCore} size={22} />
          <View style={styles.copy}>
            <Text style={styles.rowTitle}>{t(language, 'language')}</Text>
            <Text style={styles.rowValue}>{language === 'es' ? 'Español' : 'English'}</Text>
            <View style={styles.actions}>
              <Button label="ES" onPress={() => void setLanguage('es')} variant={language === 'es' ? 'selected' : 'secondary'} />
              <Button label="EN" onPress={() => void setLanguage('en')} variant={language === 'en' ? 'selected' : 'secondary'} />
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <Moon color={colors.brand.cyanCore} size={22} />
          <View style={styles.copy}>
            <Text style={styles.rowTitle}>{t(language, 'theme')}</Text>
            <Text style={styles.rowValue}>{t(language, 'darkFixed')}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Bell color={colors.brand.cyanCore} size={22} />
          <View style={styles.copy}>
            <Text style={styles.rowTitle}>{t(language, 'notifications')}</Text>
            <Text style={styles.rowValue}>{t(language, 'notificationCopy')}</Text>
            <View style={styles.actions}>
              <Button label={t(language, 'activate')} onPress={() => void requestNotificationPermissions()} variant="secondary" />
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <RefreshCw color={colors.brand.cyanCore} size={22} />
          <View style={styles.copy}>
            <Text style={styles.rowTitle}>{t(language, 'updates')}</Text>
            <Text style={styles.rowValue}>{t(language, 'updatesCopy')}</Text>
            <View style={styles.actions}>
              <Button
                disabled={isCheckingUpdate}
                label={isCheckingUpdate ? t(language, 'checking') : t(language, 'checkUpdates')}
                onPress={() => void handleCheckForUpdates()}
                variant="secondary"
              />
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <Download color={colors.brand.cyanCore} size={22} />
          <View style={styles.copy}>
            <Text style={styles.rowTitle}>{t(language, 'backup')}</Text>
            <Text style={styles.rowValue}>{t(language, 'backupCopy')}</Text>
            <View style={styles.actions}>
              <Button label={t(language, 'export')} onPress={() => void exportBackup()} />
              <Button icon={Upload} label={t(language, 'import')} onPress={() => setIsImportOpen(true)} variant="secondary" />
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <Skull color={colors.state.failed} size={22} />
          <View style={styles.copy}>
            <Text style={styles.rowTitle}>{t(language, 'closeDay')}</Text>
            <Text style={styles.rowValue}>{t(language, 'closeDayCopy')}</Text>
            <View style={styles.actions}>
              <Button label={t(language, 'closeDay')} onPress={() => void closeToday()} variant="danger" />
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setIsImportOpen(false)} transparent visible={isImportOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.brand.bone,
    fontFamily: 'Orbitron_700Bold',
    fontSize: 30,
    letterSpacing: 0,
    marginBottom: 22,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  row: {
    alignItems: 'flex-start',
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 68,
    padding: 16,
  },
  copy: {
    flex: 1,
    marginLeft: 14,
  },
  rowTitle: {
    color: colors.brand.bone,
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
  },
  rowValue: {
    color: colors.state.pending,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.74)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalPanel: {
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    width: '100%',
  },
  modalTitle: {
    color: colors.brand.bone,
    fontFamily: 'Orbitron_700Bold',
    fontSize: 20,
    letterSpacing: 0,
  },
  modalCopy: {
    color: colors.state.pending,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 8,
  },
  backupInput: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.brand.bone,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 14,
    minHeight: 180,
    padding: 12,
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 14,
  },
});
