# OneWord — Landing Page Final Polish (left-aligned text, centered CTAs, golden‑ratio column, overflow‑safe)

**Scope:** `app/landing.tsx` only.  
**Style to preserve:** lowercase, quiet/minimal, brand **ONEWORD** top‑left, content column centered with **left‑aligned text** (ragged right).  
**Do not change:** copy, button order/labels, auth logic, routing, or colors.

> **CTAs:** Keep Google / Email / Guest buttons **exactly as they are now — centered** within the column (do **not** left‑align them).

---

## ✅ Goals
1. Prevent hero/subheading text from appearing off‑screen or clipped on small devices / large fonts.
2. Keep text **left‑aligned** inside a **centered** column sized by a golden‑ratio width.
3. Maintain existing CTAs **centered** and untouched.
4. Zero auth or navigation changes.

---

## 1) Safe wrappers + centered column (left‑aligned text)

**Edit `app/landing.tsx`:** wrap in `SafeAreaView` + `ScrollView`, add a centered column. Text is left‑aligned; CTAs remain centered as they are.

```tsx
// add imports if missing
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View, Text, useWindowDimensions, Platform } from "react-native";

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
            each word you choose excludes a thousand others.{'
'}
            and in that absence, you're revealed.
          </Text>

          <Text style={styles.subheading}>
            one word a day.{'
'}
            nothing else.{'
'}
            who are you today?
          </Text>

          {/* 👉 CTAs stay **centered** exactly as they are now. Do not change their layout/props. */}
          {/* google / email / continue as guest */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

---

## 2) Styles: column centered, text left‑aligned, overflow‑safe

**Update styles in the same file** (extend your existing styles; keep palette). Key points: `alignItems: 'center'` on the scroll container to center the column; `textAlign: 'left'` on text; comfortable padding.

```ts
safe: { flex: 1, backgroundColor: '#fff' },

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
```

> If your buttons are currently centered via their own container/style, **do not remove/override it**. We only left‑align the text; **CTAs remain centered.**

---

## 3) Accessibility & Android text wrapping (nice‑to‑have)

- For cleaner multi‑line wrapping on Android, keep `textBreakStrategy: 'balanced'` on the hero `<Text>`.
- If you want absolute layout stability regardless of system font size, enable `allowFontScaling={{false}}` on the hero/subheading (but consider accessibility impact).

---

## 4) QA checklist

- Small Android + large accessibility fonts → no horizontal overflow; page scrolls vertically if needed.
- Text is **left‑aligned**; the **column is centered** on the screen.
- Brand “oneword” is **top‑left**.
- CTAs are **centered** and unchanged (order/labels/handlers the same).
- No auth/navigation changes; no new warnings.

---

## Agent notes

- Modify **only** `app/landing.tsx`.
- Do not change copy, colors, or button logic.
- Do not left‑align CTAs; keep their current centered layout.
