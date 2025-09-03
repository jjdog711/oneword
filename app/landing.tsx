import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View, Text, useWindowDimensions, Platform, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function Landing() {
  const { width } = useWindowDimensions();
  // golden‑ratio-ish; cap for readability
  const COLUMN_MAX = Math.min(Math.round(width * 0.618), 600);

  // (optional) responsive hero sizing:
  // const heroFont = Math.max(20, Math.min(28, Math.round(width / 14)));
  // const heroLine = Math.round(heroFont * 1.35);

  return (
    <SafeAreaView style={styles.safe} edges={['top','left','right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* brand */}
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>oneword</Text>
        </View>

        {/* centered column, left‑aligned text */}
        <View style={[styles.col, { maxWidth: COLUMN_MAX }]}>
          <Text
            style={[
              styles.heroText,
              // if using responsive sizing, spread { fontSize: heroFont, lineHeight: heroLine },
              { textBreakStrategy: Platform.select({ android: 'balanced', ios: 'hangul' }) }
            ]}
            // if you want to ignore OS accessibility scaling, uncomment:
            // allowFontScaling={false}
          >
            each word you choose excludes a thousand others.{'\n'}
            and in that absence, you're revealed.
          </Text>

          <Text style={styles.subheading}>
            one word a day.{'\n'}
            nothing else.{'\n'}
            who are you today?
          </Text>

          {/* 👉 CTAs stay **centered** exactly as they are now. Do not change their layout/props. */}
          <View style={styles.ctaContainer}>
            <Pressable style={[styles.button, styles.googleButton]}>
              <Text style={styles.buttonText}>Continue with Google</Text>
            </Pressable>
            
            <Pressable style={[styles.button, styles.emailButton]}>
              <Text style={styles.buttonText}>Continue with Email</Text>
            </Pressable>
            
            <Link href="/(tabs)" asChild>
              <Pressable style={[styles.button, styles.guestButton]}>
                <Text style={[styles.buttonText, styles.guestButtonText]}>Continue as Guest</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,   // edge breathing room
    paddingTop: 12,
    paddingBottom: 32,       // room for CTAs
    alignItems: 'center',    // centers the column container
  },

  brandRow: {
    width: '100%',
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  
  brandText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#111',
    textAlign: 'left',
  },

  col: {
    width: '100%',
    alignSelf: 'center',      // center the column block
    alignItems: 'flex-start', // left‑align text elements within
    paddingVertical: 28,
  },

  heroText: {
    // keep your existing 28/39 unless you enable responsive sizing above
    fontSize: 28,
    lineHeight: 39,
    fontWeight: '300',
    color: '#333',
    textAlign: 'left',
    marginBottom: 20,
    textTransform: 'lowercase',
    width: '100%',
  },

  subheading: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '300',
    color: '#666',
    textAlign: 'left',
    marginBottom: 24,
    textTransform: 'lowercase',
    width: '100%',
  },

  ctaContainer: {
    width: '100%',
    alignItems: 'center',  // keep CTAs centered
    gap: 12,
  },

  button: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  googleButton: {
    backgroundColor: '#4285f4',
  },

  emailButton: {
    backgroundColor: '#111',
  },

  guestButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  guestButtonText: {
    color: '#666',
  },
});