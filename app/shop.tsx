import { router, Stack } from 'expo-router';
import { Check, ChevronLeft, Lock, Store } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { EssenceBadge } from '@/components/EssenceBadge';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { StatTile } from '@/components/StatTile';
import {
  canAfford,
  getAuraColor,
  getAuraItems,
  getTitleItems,
  meetsRequirement,
  type ShopItem,
} from '@/core/shop';
import type { EquipResult, PurchaseResult } from '@/db/repository';
import { t, type Language } from '@/i18n';
import { confirmAction } from '@/lib/confirm';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, typography, type Rank } from '@/theme/colors';

export default function ShopScreen() {
  const language = useAppStore((state) => state.language);
  const player = useAppStore((state) => state.player);
  const ownedRewards = useAppStore((state) => state.ownedRewards);
  const purchaseReward = useAppStore((state) => state.purchaseReward);
  const equipReward = useAppStore((state) => state.equipReward);
  const unequipTitle = useAppStore((state) => state.unequipTitle);
  const isBusy = useAppStore((state) => state.isBusy);

  const esencia = player?.esencia ?? 0;
  const nivel = player?.nivel ?? 1;
  const rango = player?.rango ?? 'E';
  const equippedTitle = player?.tituloEquipado ?? null;
  const equippedAura = player?.auraEquipada ?? 'aura_cyan';

  function handleBuy(item: ShopItem) {
    confirmAction({
      title: t(language, 'buyConfirmTitle'),
      message: t(language, 'buyConfirmCopy', { name: t(language, item.nameKey as Parameters<typeof t>[1]), cost: item.cost }),
      cancelText: t(language, 'cancel'),
      confirmText: t(language, 'buy'),
      onConfirm: () => {
        void (async () => {
          // null: la compra falló y el store ya avisó.
          const result = await purchaseReward(item.id);
          if (result) notifyPurchase(result, item, language);
        })();
      },
    });
  }

  function handleEquip(item: ShopItem) {
    void (async () => {
      const result = await equipReward(item.id);
      if (result) notifyEquip(result, item, language);
    })();
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t(language, 'systemShop') }} />
      <ScreenHeader
        action={
          <Pressable
            accessibilityLabel={t(language, 'goBack')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ChevronLeft color={colors.brand.cyanCore} size={20} />
          </Pressable>
        }
        icon={Store}
        subtitle={t(language, 'shopSubtitle')}
        title={t(language, 'systemShop')}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <StatTile color={colors.brand.cyanCore} label={t(language, 'essence')} unit="ES" value={esencia} />

        <View style={styles.section}>
          <SectionHeader label={t(language, 'titles')} />
          <View style={styles.cards}>
            <NoneTitleCard active={equippedTitle === null} busy={isBusy} language={language} onPress={() => void unequipTitle()} />
            {getTitleItems().map((item) => (
              <ShopItemCard
                busy={isBusy}
                esencia={esencia}
                isEquipped={equippedTitle === item.id}
                isOwned={ownedRewards.includes(item.id)}
                item={item}
                key={item.id}
                language={language}
                nivel={nivel}
                onBuy={() => handleBuy(item)}
                onEquip={() => handleEquip(item)}
                rango={rango}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader label={t(language, 'auras')} />
          <View style={styles.cards}>
            {getAuraItems().map((item) => (
              <ShopItemCard
                busy={isBusy}
                esencia={esencia}
                isEquipped={equippedAura === item.id}
                isOwned={ownedRewards.includes(item.id)}
                item={item}
                key={item.id}
                language={language}
                nivel={nivel}
                onBuy={() => handleBuy(item)}
                onEquip={() => handleEquip(item)}
                rango={rango}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function notifyPurchase(result: PurchaseResult, item: ShopItem, language: Language) {
  if (result.ok) {
    Alert.alert(t(language, 'purchaseDone'), t(language, 'purchaseDoneCopy', { name: t(language, item.nameKey as Parameters<typeof t>[1]) }));
    return;
  }
  Alert.alert(t(language, 'purchaseFailed'), purchaseReasonCopy(result.reason, language));
}

function notifyEquip(result: EquipResult, item: ShopItem, language: Language) {
  if (result.ok) {
    Alert.alert(t(language, 'equipDone'), t(language, 'equipDoneCopy', { name: t(language, item.nameKey as Parameters<typeof t>[1]) }));
    return;
  }
  Alert.alert(t(language, 'equipFailed'), equipReasonCopy(result.reason, language));
}

function purchaseReasonCopy(reason: PurchaseResult['reason'], language: Language) {
  switch (reason) {
    case 'insufficient':
      return t(language, 'reasonInsufficient');
    case 'locked':
      return t(language, 'reasonLocked');
    case 'owned':
      return t(language, 'reasonOwned');
    default:
      return t(language, 'reasonUnknown');
  }
}

function equipReasonCopy(reason: EquipResult['reason'], language: Language) {
  switch (reason) {
    case 'notOwned':
      return t(language, 'reasonNotOwned');
    default:
      return t(language, 'reasonUnknown');
  }
}

function requirementText(item: ShopItem, language: Language): string | null {
  if (!item.requirement) return null;
  if (item.requirement.minLevel !== undefined) return t(language, 'requiresLevel', { n: item.requirement.minLevel });
  if (item.requirement.minRank !== undefined) return t(language, 'requiresRank', { r: item.requirement.minRank });
  return null;
}

type ShopItemCardProps = {
  busy: boolean;
  esencia: number;
  isEquipped: boolean;
  isOwned: boolean;
  item: ShopItem;
  language: Language;
  nivel: number;
  onBuy: () => void;
  onEquip: () => void;
  rango: Rank;
};

function ShopItemCard({ busy, esencia, isEquipped, isOwned, item, language, nivel, onBuy, onEquip, rango }: ShopItemCardProps) {
  const name = t(language, item.nameKey as Parameters<typeof t>[1]);
  const swatch = item.kind === 'aura' ? getAuraColor(item.id) : null;
  const locked = !isOwned && !meetsRequirement(item, nivel, rango);
  const affordable = canAfford(item, esencia);

  return (
    <View style={[styles.card, isEquipped && styles.cardEquipped]}>
      <View style={styles.cardInfo}>
        {swatch ? (
          <View style={[styles.swatch, { backgroundColor: swatch, borderColor: swatch, shadowColor: swatch }]} />
        ) : null}
        <View style={styles.cardCopy}>
          <Text style={styles.cardName}>{name}</Text>
          {isOwned ? null : <EssenceBadge size={13} value={item.cost} />}
          {locked ? (
            <View style={styles.requirementRow}>
              <Lock color={colors.state.pending} size={12} />
              <Text style={styles.requirementText}>{requirementText(item, language)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.cardAction}>
        {isEquipped ? (
          <View style={styles.equippedTag}>
            <Check color={colors.brand.cyanCore} size={14} />
            <Text style={styles.equippedTagText}>{t(language, 'equipped')}</Text>
          </View>
        ) : isOwned ? (
          <Button busy={busy} label={t(language, 'equip')} onPress={onEquip} variant="selected" />
        ) : locked ? null : affordable ? (
          <Button busy={busy} label={t(language, 'buy')} onPress={onBuy} />
        ) : (
          <Button disabled label={t(language, 'notEnoughEssence')} onPress={onBuy} variant="secondary" />
        )}
      </View>
    </View>
  );
}

function NoneTitleCard({ active, busy, language, onPress }: { active: boolean; busy: boolean; language: Language; onPress: () => void }) {
  return (
    <View style={[styles.card, active && styles.cardEquipped]}>
      <View style={styles.cardInfo}>
        <View style={styles.cardCopy}>
          <Text style={styles.cardName}>{t(language, 'none')}</Text>
          <Text style={styles.noneHint}>{t(language, 'noneTitle')}</Text>
        </View>
      </View>
      <View style={styles.cardAction}>
        {active ? (
          <View style={styles.equippedTag}>
            <Check color={colors.brand.cyanCore} size={14} />
            <Text style={styles.equippedTagText}>{t(language, 'equipped')}</Text>
          </View>
        ) : (
          <Button busy={busy} label={t(language, 'equip')} onPress={onPress} variant="secondary" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: 18,
    paddingBottom: 28,
  },
  section: {
    gap: 10,
  },
  cards: {
    gap: 10,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  cardEquipped: {
    borderColor: colors.brand.cyanCore,
  },
  cardInfo: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  swatch: {
    borderRadius: 999,
    borderWidth: 1,
    height: 26,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    width: 26,
  },
  cardCopy: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 7,
    minWidth: 0,
  },
  cardName: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 15,
  },
  noneHint: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 12,
  },
  requirementRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  requirementText: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 12,
  },
  cardAction: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  equippedTag: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
  },
  equippedTagText: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
    textTransform: 'uppercase',
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
