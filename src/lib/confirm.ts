import { Alert, Platform } from 'react-native';

type ConfirmOptions = {
  title: string;
  message: string;
  cancelText: string;
  confirmText: string;
  destructive?: boolean;
  onConfirm: () => void;
};

export function confirmAction({ cancelText, confirmText, destructive, message, onConfirm, title }: ConfirmOptions) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
