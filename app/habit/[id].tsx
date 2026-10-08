import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Archive, BarChart3, CalendarDays, Check, Clock, Cpu, Edit3, Flame, Target, Terminal, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import type { HabitInsightInput } from '@/core/aiContext';
import { normalizeHabitAttributes, type AttributeId } from '@/core/attributes';
import { getCompletionXp } from '@/core/xp';
import type { EventRecord, HabitInsightDay, HabitInsightRecord, HabitRecord } from '@/db/repository';
import { t, type Language } from '@/i18n';
import { getHabitAttribute } from '@/lib/habitAttributes';
import { getHabitIconComponent } from '@/lib/habitIcons';
import { confirmAction } from '@/lib/confirm';
import { formatWeekdays, getWeekdayInitial, type WeekdayId } from '@/lib/weekdays';
import { useAiStore } from '@/stores/aiStore';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, typography } from '@/theme/colors';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [habit, setHabit] = useState<HabitRecord | null>(null);
  const [insight, setInsight] = useState<HabitInsightRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const archiveHabitById = useAppStore((state) => state.archiveHabitById);
  const getHabitById = useAppStore((state) => state.getHabitById);
  const getHabitInsightById = useAppStore((state) => state.getHabitInsightById);
  const unarchiveHabitById = useAppStore((state) => state.unarchiveHabitById);
  const language = useAppStore((state) => state.language);
  const ensureHabitInsight = useAiStore((state) => state.ensureHabitInsight);
  const systemInsight = useAiStore((state) => (id ? state.habitInsights[id] : undefined));

  // Lee el hábito y sus métricas. Devuelve false si la lectura falló; nunca rechaza. `isCurrent`
  // descarta el resultado de una carga que ya no corresponde (pantalla sin foco o desmontada).
  const loadHabit = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      if (!id) return;
      try {
        const [nextHabit, nextInsight] = await Promise.all([getHabitById(id), getHabitInsightById(id)]);
        if (!isCurrent()) return;
        setHabit(nextHabit);
        setInsight(nextInsight);
        setLoadFailed(false);
      } catch {
        if (isCurrent()) setLoadFailed(true);
      } finally {
        if (isCurrent()) setIsLoading(false);
      }
    },
    [getHabitById, getHabitInsightById, id],
  );

  // Carga al enfocar, no solo al montar: al volver de editar, el detalle muestra lo guardado. El
  // spinner solo sale en la primera carga; después se refresca con el contenido visible.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      void loadHabit(() => isActive);
      return () => {
        isActive = false;
      };
    }, [loadHabit]),
  );

  // Deriva el HabitInsightInput (entrada del core de IA) desde lo que la pantalla ya tiene. Ojo:
  // insight.last7 viene del más RECIENTE al más antiguo; el core lo espera del más antiguo al más
  // reciente, así que lo invertimos y mapeamos a estados. mejorRachaHabito no está en el insight: usamos
  // la racha actual como cota inferior honesta (la mejor racha es al menos la actual; la voz determinista
  // no la usa y el prompt LLM solo la lista).
  const insightInput = useMemo<HabitInsightInput | null>(() => {
    if (!habit || !insight) return null;
    return {
      nombre: habit.nombre,
      consistency30: insight.consistency30.ratio,
      currentStreak: insight.currentStreak,
      mejorRachaHabito: insight.currentStreak,
      importancia: habit.importancia,
      atributos: normalizeHabitAttributes(habit.atributos),
      last7: insight.last7.map((day) => day.status).reverse(),
    };
  }, [habit, insight]);

  // Pide el micro-comentario del Sistema cuando el insight ya está cargado: plantilla al instante y, si
  // el LLM está activo, lo enriquece en background. No bloquea la pantalla.
  useEffect(() => {
    if (id && insightInput) void ensureHabitInsight(id, insightInput);
  }, [ensureHabitInsight, id, insightInput]);

  if (isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t(language, 'habitDetail') }} />
        <ActivityIndicator color={colors.brand.cyanCore} />
      </Screen>
    );
  }

  if (loadFailed && (!habit || !insight)) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t(language, 'habitDetail') }} />
        <ScreenHeader subtitle={t(language, 'habitDetailSubtitle')} title={t(language, 'habitDetail')} />
        <Text style={styles.empty}>{t(language, 'habitLoadFailed')}</Text>
        <View style={styles.retry}>
          <Button
            label={t(language, 'retry')}
            onPress={() => {
              setIsLoading(true);
              void loadHabit();
            }}
            variant="secondary"
          />
        </View>
      </Screen>
    );
  }

  if (!habit || !insight || !id) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t(language, 'habitDetail') }} />
        <ScreenHeader subtitle={t(language, 'habitDetailSubtitle')} title={t(language, 'habitDetail')} />
        <Text style={styles.empty}>{t(language, 'noHabitMetrics')}</Text>
      </Screen>
    );
  }

  const Icon = getHabitIconComponent(habit.icono);
  const xp = getCompletionXp(habit.importancia, 0);
  const attributes = normalizeHabitAttributes(habit.atributos);
  const consistencyPercent = Math.round(insight.consistency30.ratio * 100);

  async function archiveCurrentHabit() {
    if (await archiveHabitById(id)) router.back();
  }

  async function unarchiveCurrentHabit() {
    if (await unarchiveHabitById(id)) await loadHabit();
  }

  function handleArchive() {
    confirmAction({
      cancelText: t(language, 'cancel'),
      confirmText: t(language, 'archiveHabit'),
      destructive: true,
      message: t(language, 'archiveHabitConfirmCopy'),
      onConfirm: () => void archiveCurrentHabit(),
      title: t(language, 'archiveHabitConfirmTitle'),
    });
  }

  function handleUnarchive() {
    confirmAction({
      cancelText: t(language, 'cancel'),
      confirmText: t(language, 'unarchiveHabit'),
      message: t(language, 'unarchiveHabitConfirmCopy'),
      onConfirm: () => void unarchiveCurrentHabit(),
      title: t(language, 'unarchiveHabitConfirmTitle'),
    });
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t(language, 'habitDetail') }} />
      <ScreenHeader
        subtitle={t(language, 'habitDetailSubtitle')}
        title={t(language, 'habitDetail')}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, habit.archivado && styles.archivedHero]}>
          <View style={styles.heroTop}>
            <View style={styles.iconTile}>
              {habit.archivado ? <Archive color={colors.state.pending} size={24} /> : <Icon color={colors.brand.cyanCore} size={24} />}
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.kicker}>{habit.archivado ? t(language, 'archived') : t(language, 'active')}</Text>
              <Text numberOfLines={2} style={styles.title}>{habit.nombre}</Text>
              <Text style={styles.metaText}>
                +{xp} XP · {habit.tipo === 'binario' ? t(language, 'binary') : t(language, 'goal', { goal: habit.meta })}
              </Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <InfoPill label={t(language, 'importance')} value={`◆ ${habit.importancia}`} />
            <InfoPill label={t(language, 'days')} value={formatWeekdays(habit.diasSemana, language)} />
            <AttributePill attributes={attributes} label={t(language, 'attributes')} language={language} />
            <InfoPill label={t(language, 'reminder')} value={habit.horaRecordatorio ?? t(language, 'noReminder')} />
          </View>
        </View>

        {systemInsight?.text ? (
          <View style={styles.systemCard}>
            <View style={styles.systemIcon}>
              <Terminal color={colors.brand.cyanCore} size={16} />
            </View>
            <View style={styles.systemCopy}>
              <View style={styles.systemLabelRow}>
                <Text style={styles.systemKicker}>◆ {t(language, 'systemChatLabel')}</Text>
                {systemInsight.fromAi ? (
                  <View style={styles.aiBadge}>
                    <Cpu color={colors.brand.cyanCore} size={10} />
                    <Text style={styles.aiBadgeText}>{t(language, 'systemMessageAiBadge')}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.systemMessage}>{systemInsight.text}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.twoColumns}>
          <MetricPanel
            color={getStatusColor(insight.today.status)}
            icon={Target}
            label={t(language, 'todayStatus')}
            value={getTodayStatusText(insight.today, language)}
          />
          <MetricPanel
            color={colors.state.streak}
            icon={Flame}
            label={t(language, 'currentStreak')}
            value={`${insight.currentStreak} ${t(language, 'occurrencesUnit')}`}
          />
        </View>

        <View style={styles.panel}>
          <View style={styles.panelTitleRow}>
            <View style={styles.panelTitleCopy}>
              <BarChart3 color={colors.brand.cyanCore} size={14} />
              <Text style={styles.panelTitle}>{t(language, 'consistency30')}</Text>
            </View>
            <Text style={styles.panelMetric}>{consistencyPercent}%</Text>
          </View>
          <ProgressBar ratio={insight.consistency30.ratio} color={colors.brand.cyanCore} />
          <Text style={styles.panelMeta}>
            {insight.consistency30.completed}/{insight.consistency30.scheduled} {t(language, 'scheduledUnit')} · {insight.consistency30.failed} {t(language, 'failedUnit')}
          </Text>
        </View>

        <View style={styles.panel}>
          <SectionHeader accent={colors.brand.cyanCore} label={t(language, 'last7Days')} />
          <View style={styles.dayStrip}>
            {insight.last7.map((day) => (
              <DayCell key={day.fecha} day={day} language={language} />
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <SectionHeader label={t(language, 'recentHistory')} />
          <View style={styles.events}>
            {insight.recentEvents.length === 0 ? (
              <Text style={styles.empty}>{t(language, 'noHabitEvents')}</Text>
            ) : (
              insight.recentEvents.map((event) => <EventRow key={event.id} event={event} language={language} />)
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <View style={styles.actionDivider} />
          <View style={styles.actionRow}>
            <Button icon={X} label={t(language, 'cancel')} onPress={() => router.back()} style={styles.cancelAction} variant="secondary" />
            <Button icon={Edit3} label={t(language, 'edit')} onPress={() => router.push(`/habit/edit/${id}`)} style={styles.primaryAction} />
          </View>
          {habit.archivado ? (
            <Button icon={Archive} label={t(language, 'unarchiveHabit')} onPress={handleUnarchive} style={styles.archiveAction} variant="secondary" />
          ) : (
            <Button icon={Archive} label={t(language, 'archiveHabit')} onPress={handleArchive} style={styles.archiveAction} variant="danger" />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function AttributePill({ attributes, label, language }: { attributes: AttributeId[]; label: string; language: Language }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.attributeCodes}>
        {attributes.map((attributeId) => {
          const attribute = getHabitAttribute(attributeId);
          return (
            <Text key={attribute.id} style={[styles.attributeCode, { color: attribute.color }]}>
              {t(language, `attr_${attribute.id}_code`)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

function MetricPanel({
  color,
  icon: Icon,
  label,
  value,
}: {
  color: string;
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <View style={[styles.metricPanel, { borderColor: `${color}99` }]}>
      <View style={[styles.metricIcon, { borderColor: color, backgroundColor: `${color}14` }]}>
        <Icon color={color} size={17} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

function DayCell({ day, language }: { day: HabitInsightDay; language: Language }) {
  const color = getStatusColor(day.status);
  const Icon = getStatusIcon(day.status);

  return (
    <View style={styles.dayCell}>
      <Text style={styles.dayLabel}>{getWeekdayInitial(language, day.weekday as WeekdayId)}</Text>
      <View style={[styles.dayStatus, { borderColor: color, backgroundColor: `${color}14` }]}>
        <Icon color={color} size={14} />
      </View>
      <Text style={styles.dayAmount}>{day.status === 'no_programado' ? '-' : `${day.cantidad}/${day.meta}`}</Text>
    </View>
  );
}

function EventRow({ event, language }: { event: EventRecord; language: 'es' | 'en' }) {
  const positive = event.xpDelta >= 0;
  const eventLabel = event.tipoEvento === 'completado' ? t(language, 'completed') : t(language, 'failed');

  return (
    <View style={styles.eventRow}>
      <View style={[styles.eventIcon, positive ? styles.eventPositiveIcon : styles.eventNegativeIcon]}>
        {positive ? <Check color={colors.state.completed} size={14} /> : <X color={colors.state.failed} size={14} />}
      </View>
      <View style={styles.eventCopy}>
        <Text style={styles.eventName}>{eventLabel}</Text>
        <View style={styles.eventMetaRow}>
          <Clock color={colors.state.pending} size={11} />
          <Text style={styles.eventMeta}>{event.fecha}</Text>
        </View>
      </View>
      <Text style={[styles.eventXp, positive ? styles.positive : styles.negative]}>{positive ? '+' : ''}{event.xpDelta} XP</Text>
    </View>
  );
}

function getTodayStatusText(day: HabitInsightDay, language: 'es' | 'en') {
  if (day.status === 'no_programado') return t(language, 'notScheduledToday');
  if (day.status === 'completado') return t(language, 'completed');
  if (day.status === 'fallado') return t(language, 'failed');
  if (day.meta > 1 && day.cantidad > 0) return `${day.cantidad}/${day.meta}`;
  return t(language, 'pending');
}

function getStatusColor(status: HabitInsightDay['status']) {
  if (status === 'completado') return colors.state.completed;
  if (status === 'fallado') return colors.state.failed;
  if (status === 'no_programado') return colors.state.pending;
  return colors.brand.cyanCore;
}

function getStatusIcon(status: HabitInsightDay['status']) {
  if (status === 'completado') return Check;
  if (status === 'fallado') return X;
  if (status === 'no_programado') return CalendarDays;
  return Target;
}

const styles = StyleSheet.create({
  scroll: {
    gap: 16,
    paddingBottom: 24,
  },
  hero: {
    backgroundColor: colors.background.surface,
    borderColor: colors.brand.cyanShadow,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 14,
    overflow: 'hidden',
    padding: 16,
  },
  archivedHero: {
    borderColor: colors.background.borderBright,
    opacity: 0.76,
  },
  systemCard: {
    alignItems: 'center',
    backgroundColor: colors.background.surfaceRaised,
    borderColor: colors.brand.cyanCore,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  systemIcon: {
    alignItems: 'center',
    backgroundColor: `${colors.brand.cyanCore}14`,
    borderColor: colors.brand.cyanCore,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  systemCopy: {
    flex: 1,
    minWidth: 0,
  },
  systemLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  systemKicker: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  aiBadge: {
    alignItems: 'center',
    backgroundColor: `${colors.brand.cyanCore}14`,
    borderColor: colors.brand.cyanShadow,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  aiBadgeText: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  systemMessage: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  heroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconTile: {
    alignItems: 'center',
    backgroundColor: `${colors.brand.cyanCore}12`,
    borderColor: colors.brand.cyanCore,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodySemiBold,
    fontSize: 20,
    lineHeight: 25,
    marginTop: 4,
  },
  metaText: {
    color: colors.rank.S,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
    marginTop: 4,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoPill: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 58,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  infoLabel: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  infoValue: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 13,
    marginTop: 3,
  },
  attributeCodes: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 3,
  },
  attributeCode: {
    fontFamily: typography.font.displayBold,
    fontSize: 11,
  },
  twoColumns: {
    flexDirection: 'row',
    gap: 10,
  },
  metricPanel: {
    backgroundColor: colors.background.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 7,
    minHeight: 124,
    padding: 14,
  },
  metricIcon: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  metricLabel: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontFamily: typography.font.bodySemiBold,
    fontSize: 16,
    lineHeight: 20,
  },
  panel: {
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  panelTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panelTitleCopy: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  panelTitle: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  panelMetric: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayBold,
    fontSize: 14,
  },
  panelMeta: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 13,
  },
  dayStrip: {
    flexDirection: 'row',
    gap: 7,
  },
  dayCell: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  dayLabel: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
  },
  dayStatus: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: 'center',
    width: '100%',
  },
  dayAmount: {
    color: colors.brand.boneMuted,
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
  },
  events: {
    gap: 8,
  },
  eventRow: {
    alignItems: 'center',
    borderBottomColor: colors.background.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 10,
    paddingTop: 2,
  },
  eventIcon: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  eventPositiveIcon: {
    backgroundColor: `${colors.state.completed}1A`,
    borderColor: colors.state.completed,
  },
  eventNegativeIcon: {
    backgroundColor: `${colors.state.failed}1A`,
    borderColor: colors.state.failed,
  },
  eventCopy: {
    flex: 1,
    minWidth: 0,
  },
  eventName: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  eventMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 3,
  },
  eventMeta: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 11,
  },
  eventXp: {
    fontFamily: typography.font.displayBold,
    fontSize: 12,
  },
  positive: {
    color: colors.state.completed,
  },
  negative: {
    color: colors.state.failed,
  },
  empty: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    paddingVertical: 12,
    textAlign: 'center',
  },
  retry: {
    alignItems: 'center',
  },
  actions: {
    backgroundColor: colors.background.surface,
    borderColor: colors.background.borderBright,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: 2,
    overflow: 'hidden',
    padding: 10,
    position: 'relative',
  },
  actionRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    width: '100%',
  },
  actionDivider: {
    backgroundColor: colors.brand.cyanCore,
    bottom: 0,
    left: 0,
    opacity: 0.72,
    position: 'absolute',
    top: 0,
    width: 3,
  },
  cancelAction: {
    borderColor: colors.background.borderBright,
    flex: 1,
    marginRight: 8,
  },
  primaryAction: {
    flex: 1.6,
    minHeight: 50,
  },
  archiveAction: {
    marginTop: 8,
    minHeight: 46,
    width: '100%',
  },
});
