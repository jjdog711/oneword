# Fix Cold-Launch Route: Auth-Aware Index + Default Global Tab

**Goal:**  
On a fresh launch, avoid the “Unmatched Route” and send users to the correct screen:
- **Signed-in** → `/(tabs)/global`
- **Signed-out / guest** → `/landing`

Also ensure the **tabs group defaults to `global`** whenever it’s entered without a specific child route (belt-and-suspenders to the redirect).

Repo context (confirmed):
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/global.tsx`
- `app/(tabs)/friends.tsx`
- `app/landing.tsx`
- `src/services/supabase.ts`

No other screens or logic should change.

---

## 1) Add Auth-Aware Index Route

**Create:** `app/index.tsx`

```tsx
import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { supabase } from "@/src/services/supabase";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    // One-shot session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setIsSignedIn(!!session);
      setLoading(false);
    });

    // Stay correct if auth changes while app is open
    const { data: subscription } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!mounted) return;
      setIsSignedIn(!!session);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  if (loading || isSignedIn === null) return null; // (optional) show a splash here

  // Auth-aware redirect:
  return isSignedIn
    ? <Redirect href="/(tabs)/global" />
    : <Redirect href="/landing" />;
}
```

**Why:**  
- Fixes the “Unmatched Route” by giving `/` an index.
- Respects signed-in users by sending them straight into the app.

---

## 2) Set Tabs’ Default Screen to Global

**Edit:** `app/(tabs)/_layout.tsx`

- Add `initialRouteName="global"` to the `<Tabs>` component’s props.  
  This ensures that **if the app navigates into the tabs group without a specific child route**, it lands on **global**.

**Example (diff-style):**
```tsx
// before:
<Tabs
  screenOptions={{
    headerShown: false,
    // ...existing options
  }}
>
  {/* ...screens */}
</Tabs>

// after:
<Tabs
  initialRouteName="global"
  screenOptions={{
    headerShown: false,
    // ...existing options
  }}
>
  {/* ...screens */}
</Tabs>
```

**Why (clarification):**
- The **auth-aware redirect** in `app/index.tsx` already points to `/(tabs)/global`.  
- `initialRouteName="global"` is an **additional safety** so that any future navigation into `/(tabs)` (without a deep link like `/(tabs)/global`) still opens the **global** tab by default.

---

## 3) (Optional) Friendly 404

**Create:** `app/+not-found.tsx` (optional, but nice)

```tsx
import { Link } from "expo-router";
import { View, Text } from "react-native";

export default function NotFound() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ fontSize: 18, marginBottom: 12 }}>page not found</Text>
      <Link href="/landing">go to landing</Link>
    </View>
  );
}
```

---

## 4) QA Checklist

- Cold launch while **signed out** → opens **/landing**; no Unmatched Route.  
- Cold launch while **signed in** → opens **/(tabs)/global**.  
- Navigating to the tabs group without a specific child route → lands on **global** (thanks to `initialRouteName`).  
- No other screens’ behavior changed; no crashes; no warnings introduced.

---

## Notes for Agent

- Do **not** rename `landing.tsx`. We’re adding `app/index.tsx` instead to keep routes explicit and auth-aware.  
- Do not modify other pages, styles, or logic. Only the two changes above (plus optional 404).
