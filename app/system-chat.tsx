import { router } from 'expo-router';
import { ChevronLeft, Send, Terminal, Trash2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { confirmAction } from '@/lib/confirm';
import { useAiStore } from '@/stores/aiStore';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, typography } from '@/theme/colors';
import type { AiMessage } from '@/db/repository';

export default function SystemChatScreen() {
  const language = useAppStore((state) => state.language);
  const messages = useAiStore((state) => state.messages);
  const isGenerating = useAiStore((state) => state.isGenerating);
  const loadAi = useAiStore((state) => state.loadAi);
  const openChat = useAiStore((state) => state.openChat);
  const sendMessage = useAiStore((state) => state.sendMessage);
  const clearChat = useAiStore((state) => state.clearChat);

  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<AiMessage>>(null);

  // Monta el chat: primero carga perfil + historial, y solo entonces dispara el saludo proactivo.
  // openChat depende del profile cargado por loadAi, así que el orden importa.
  useEffect(() => {
    let active = true;
    void (async () => {
      await loadAi();
      if (active) await openChat();
    })();
    return () => {
      active = false;
    };
  }, [loadAi, openChat]);

  // Desplaza al último mensaje cuando llega contenido nuevo o aparece el indicador de escritura.
  function scrollToEnd() {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }

  useEffect(() => {
    scrollToEnd();
  }, [messages.length, isGenerating]);

  function handleSend() {
    const text = draft.trim();
    if (!text || isGenerating) return;
    setDraft('');
    void sendMessage(text);
  }

  function handleClear() {
    confirmAction({
      title: t(language, 'systemChatClearConfirmTitle'),
      message: t(language, 'systemChatClearConfirmCopy'),
      cancelText: t(language, 'cancel'),
      confirmText: t(language, 'systemChatClear'),
      destructive: true,
      onConfirm: () => void clearChat(),
    });
  }

  const canSend = draft.trim().length > 0 && !isGenerating;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.iconButton}>
          <ChevronLeft color={colors.brand.cyanCore} size={20} />
        </Pressable>
        <View style={styles.headerCopy}>
          <View style={styles.headerLabelRow}>
            <Terminal color={colors.brand.cyanCore} size={12} />
            <Text style={styles.headerLabel}>{t(language, 'systemChatLabel')}</Text>
          </View>
          <Text style={styles.headerTitle}>{t(language, 'systemChatTitle')}</Text>
        </View>
        <Pressable
          accessibilityLabel={t(language, 'systemChatClear')}
          accessibilityRole="button"
          onPress={handleClear}
          style={styles.iconButton}
        >
          <Trash2 color={colors.state.failed} size={18} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
        style={styles.flex}
      >
        <FlatList
          ref={listRef}
          contentContainerStyle={styles.listContent}
          data={messages}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={isGenerating ? <TypingBubble label={t(language, 'systemChatLabel')} /> : null}
          onContentSizeChange={scrollToEnd}
          renderItem={({ item }) => <MessageBubble message={item} systemLabel={t(language, 'systemChatLabel')} />}
          showsVerticalScrollIndicator={false}
        />

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            cursorColor={colors.brand.cyanCore}
            multiline
            onChangeText={setDraft}
            placeholder={t(language, 'systemChatInputPlaceholder')}
            placeholderTextColor={colors.state.pending}
            selectionColor={colors.brand.cyanShadow}
            style={styles.input}
            value={draft}
          />
          <Pressable
            accessibilityLabel={t(language, 'systemChatSend')}
            accessibilityRole="button"
            disabled={!canSend}
            onPress={handleSend}
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          >
            <Send color={canSend ? colors.background.void : colors.state.pending} size={18} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function MessageBubble({ message, systemLabel }: { message: AiMessage; systemLabel: string }) {
  const isUser = message.rol === 'user';
  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.contenido}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.systemRow}>
      <Text style={styles.systemLabel}>{systemLabel}</Text>
      <View style={styles.systemBubble}>
        <Text style={styles.systemText}>{message.contenido}</Text>
      </View>
    </View>
  );
}

function TypingBubble({ label }: { label: string }) {
  return (
    <View style={styles.systemRow}>
      <Text style={styles.systemLabel}>{label}</Text>
      <View style={[styles.systemBubble, styles.typingBubble]}>
        <TypingDot delay={0} />
        <TypingDot delay={160} />
        <TypingDot delay={320} />
      </View>
    </View>
  );
}

function TypingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: delay, easing: Easing.linear }),
        withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 300, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [delay, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.typingDot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background.void,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.background.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  headerLabel: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 22,
    marginTop: 2,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  listContent: {
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  systemRow: {
    alignItems: 'flex-start',
    gap: 5,
    maxWidth: '88%',
  },
  systemLabel: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
    marginLeft: 2,
    textTransform: 'uppercase',
  },
  systemBubble: {
    backgroundColor: colors.background.surfaceRaised,
    borderColor: colors.brand.cyanShadow,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  systemText: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  typingBubble: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 14,
  },
  typingDot: {
    backgroundColor: colors.brand.cyanCore,
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  userRow: {
    alignItems: 'flex-end',
    maxWidth: '88%',
    alignSelf: 'flex-end',
  },
  userBubble: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.borderBright,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  userText: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  inputBar: {
    alignItems: 'flex-end',
    borderTopColor: colors.background.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  input: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.brand.bone,
    flex: 1,
    fontFamily: typography.font.bodyRegular,
    fontSize: 14,
    maxHeight: 120,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.cyanCore,
    borderColor: colors.brand.cyanCore,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sendButtonDisabled: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
  },
});
