import { Image, StyleSheet, View, StyleProp, ViewStyle, ImageSourcePropType } from 'react-native';
import { Grad } from './Grad';
import { colors } from '../constants/theme';
import { EyeStyle } from '../constants/game-data';

/**
 * Geometric mascot avatar — a rounded-square gradient tile with white eyes/mouth.
 * Intentional placeholder for real character art; features scale with `size`.
 */
export function Mascot({
  size,
  radius,
  gradient,
  eyes = 'round',
  mouth = 'smile',
  crown = false,
  ring,
  portrait,
  style,
}: {
  size: number;
  radius: number;
  gradient: readonly [string, string, ...string[]];
  eyes?: EyeStyle;
  mouth?: 'smile' | 'flat';
  crown?: boolean;
  portrait?: ImageSourcePropType;
  /** Optional extra shadow / box-shadow style merged onto the tile. */
  ring?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}) {
  const eyeW = size * 0.13;
  const eyeH = eyes === 'round' ? eyeW : eyes === 'mid' ? eyeW * 0.8 : eyeW * 0.62;
  const eyeY = size * 0.33;
  const leftX = size * 0.25;
  const rightX = size * 0.615;

  const mouthW = mouth === 'smile' ? size * 0.3 : size * 0.27;
  const mouthH = mouth === 'smile' ? size * 0.11 : size * 0.09;
  const mouthX = (size - mouthW) / 2;
  const mouthY = size * 0.6;

  return (
    <View style={style}>
      <Grad
        colors={gradient}
        angle={160}
        style={[{ width: size, height: size, borderRadius: radius, overflow: 'hidden' }, ring]}>
        {portrait ? (
          <Image
            source={portrait}
            resizeMode="cover"
            style={[StyleSheet.absoluteFillObject, { width: size, height: size, borderRadius: radius }]}
          />
        ) : (
          <>
            {crown && (
            <View
              style={{
                position: 'absolute',
              left: size * 0.32,
              top: size * 0.045,
              width: size * 0.36,
              height: size * 0.09,
              borderRadius: 2,
              backgroundColor: colors.brass,
            }}
              />
            )}
            <View
              style={{
                position: 'absolute',
                left: leftX,
                top: eyeY,
                width: eyeW,
                height: eyeH,
                borderRadius: eyes === 'round' ? eyeW : 2,
                backgroundColor: '#fff',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: rightX,
                top: eyeY,
                width: eyeW,
                height: eyeH,
                borderRadius: eyes === 'round' ? eyeW : 2,
                backgroundColor: '#fff',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: mouthX,
                top: mouthY,
                width: mouthW,
                height: mouthH,
                borderBottomLeftRadius: mouth === 'smile' ? mouthH : 2,
                borderBottomRightRadius: mouth === 'smile' ? mouthH : 2,
                borderTopLeftRadius: mouth === 'smile' ? 0 : 2,
                borderTopRightRadius: mouth === 'smile' ? 0 : 2,
                backgroundColor: 'rgba(255,255,255,0.92)',
              }}
            />
          </>
        )}
      </Grad>
    </View>
  );
}
