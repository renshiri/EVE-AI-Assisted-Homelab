import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { Terminal } from 'lucide-react-native';

const AnimatedBar = ({ minHeight, maxHeight, duration }) => {
  const heightAnim = useSharedValue(minHeight);

  useEffect(() => {
    heightAnim.value = withRepeat(
      withTiming(maxHeight, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [maxHeight, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: heightAnim.value,
  }));

  return <Animated.View style={[styles.waveBar, animatedStyle]} />;
};

export default function EVEAvatar({ onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.container, pressed && { opacity: 0.8 }]}>
      
        {/* Rahmen-Container im Terminal-Stil */}
        <View style={styles.coreWrapper}>
          
          <View style={styles.topGlowLine} />

          <View style={styles.contentRow}>
            {/* Minimalistisches Icon */}
            <View style={styles.iconBox}>
              <Terminal size={14} color="#22d3ee" />
            </View>

            {/* Animierter Equalizer / Soundwave */}
            <View style={styles.waveContainer}>
              <AnimatedBar minHeight={8} maxHeight={28} duration={600} />
              <AnimatedBar minHeight={16} maxHeight={36} duration={450} />
              <AnimatedBar minHeight={6} maxHeight={24} duration={750} />
              <AnimatedBar minHeight={12} maxHeight={32} duration={500} />
              <AnimatedBar minHeight={10} maxHeight={22} duration={650} />
            </View>

            {/* Label */}
            <View style={styles.labelCol}>
              <Text style={styles.eveText}>EVE</Text>
              <Text style={styles.subText}>STREAM</Text>
            </View>
          </View>

        </View>

    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    width: '100%',
  },
  coreWrapper: {
    width: '100%',
    maxWidth: 240,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  topGlowLine: {
    position: 'absolute',
    top: 0,
    left: '30%',
    width: '40%',
    height: 1.5,
    backgroundColor: '#06b6d4',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    paddingHorizontal: 10,
  },
  waveBar: {
    width: 3.5,
    backgroundColor: '#22d3ee',
    borderRadius: 2,
  },
  labelCol: {
    alignItems: 'flex-end',
  },
  eveText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  subText: {
    fontSize: 7,
    color: '#64748b',
    letterSpacing: 1,
    marginTop: 1,
  },
});