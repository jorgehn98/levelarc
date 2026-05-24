import type { ComponentType, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideProps } from 'lucide-react-native';

import { colors, typography } from '@/theme/colors';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ComponentType<LucideProps>;
};

export function ScreenHeader({ title, subtitle, action, icon: Icon }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        {subtitle ? (
          <View style={styles.subtitleRow}>
            {Icon ? <Icon color={colors.brand.cyanCore} size={13} /> : <Text style={styles.bullet}>◆</Text>}
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        ) : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  subtitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  bullet: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
  },
  subtitle: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 30,
    lineHeight: 38,
    marginTop: 2,
  },
  action: {
    marginLeft: 12,
  },
});
