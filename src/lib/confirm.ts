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

// Aviso de un solo botón. Alert de react-native-web no hace nada, así que en web se usa el del
// navegador para que la previsualización también lo muestre.
export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    globalThis.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}
