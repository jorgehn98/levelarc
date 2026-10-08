import { Linking } from 'react-native';

import { t, type Language } from '@/i18n';
import { confirmAction } from '@/lib/confirm';

// El sistema no deja notificar: se dice y se ofrece el atajo a los ajustes del sistema. Para un
// hábito, la siguiente sincronización programa el recordatorio cuando haya permiso.
export function warnRemindersDisabled(
  language: Language,
  messageKey: 'habitReminderDisabledCopy' | 'notificationPermissionDeniedCopy',
) {
  confirmAction({
    title: t(language, 'notificationPermissionDenied'),
    message: t(language, messageKey),
    cancelText: t(language, 'later'),
    confirmText: t(language, 'openSystemSettings'),
    onConfirm: () => void Linking.openSettings().catch(() => undefined),
  });
}
