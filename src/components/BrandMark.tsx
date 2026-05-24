import type { ImageStyle, StyleProp } from 'react-native';
import { Image, StyleSheet, View } from 'react-native';

const sources = {
  transparent: require('../../assets/brand/levelarc-emblem-detailed-transparent.png'),
  simpleDark: require('../../assets/brand/levelarc-emblem-simple-dark.png'),
  rich: require('../../assets/brand/levelarc-emblem-rich-circuit.png'),
};

type BrandMarkVariant = keyof typeof sources;

type BrandMarkProps = {
  size?: number;
  variant?: BrandMarkVariant;
  style?: StyleProp<ImageStyle>;
};

export function BrandMark({ size = 96, variant = 'transparent', style }: BrandMarkProps) {
  return (
    <View style={[styles.frame, { height: size, width: size }]}>
      <Image
        accessibilityIgnoresInvertColors
        source={sources[variant]}
        style={[styles.image, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    height: '100%',
    resizeMode: 'contain',
    width: '100%',
  },
});
