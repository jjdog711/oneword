# Cursor Agent Prompt — Time Zone Hardening (Refined)

## Goal
Refactor the OneWord app so that **all “day” logic (daily cutoff, reveal windows, journaling)** is deterministic and anchored on the **user’s IANA time zone** with server truth. Replace ad-hoc date math with centralized utilities. Maintain minimal impact and leave server/database changes as proposals only.

---

## Mode
- **ASK MODE ONLY** — do not write files until I approve.
- Always produce a **checklist of affected files** and proposed diffs first.
- No changes to Supabase RPCs, migrations, or schema unless explicitly confirmed.

---

## Execution Guidelines

### Package Manager
- Assume **npm**.  
- Propose changes to `package.json` only.  
- Do not touch or regenerate lockfiles.

### Testing Framework
- Assume **Jest** (Expo default).  
- Write test proposals in Jest syntax.

### Audit Filtering
- When scanning for date usage, **only include logic relevant to daily cycles**:
  - Word send cutoffs
  - Reveal windows (instant/mutual/scheduled)
  - Journals
  - Notification scheduling
- Exclude trivial uses (e.g., logging, display-only formatting, analytics timestamps).

### Profile Timezone Field
- To check if `profiles.timezone` exists:
  - Search SQL migrations in `supabase/` or `*.sql` files.
  - If no match, output the migration stub proposal.
- Do **not** assume it exists in the live DB.

---

## Tasks

### 1. Inventory current time usage
- Search for:
  - `new Date()`, `Date.now()`, `.toISOString()`
  - Manual `format(...)`
  - Any cutoff comparisons
- Create `docs/timezone_audit.md` with a filtered table:
  - **File**
  - **Line snippet**
  - **Intent** (e.g., compute day key, enforce cutoff, schedule reveal)

### 2. Dependency check
- Inspect `package.json`.
- If `date-fns-tz` is missing, propose adding:
  ```json
  "dependencies": {
    "date-fns-tz": "^3.x"
  }
  ```
- Keep all existing versions pinned. Do **not** upgrade anything else.
- Output as a diff proposal only.

### 3. Central date utility module
- Create a new file proposal: `src/lib/dates.ts`.
- Implement these helpers using `date-fns` + `date-fns-tz`:

```ts
import { startOfDay } from "date-fns";
import { zonedTimeToUtc, utcToZonedTime, format as tzFormat } from "date-fns-tz";

export function getDayKeyForUser(tz: string, at: Date = new Date()): string {
  const local = utcToZonedTime(at, tz);
  const localStart = startOfDay(local);
  const asUtc = zonedTimeToUtc(localStart, tz);
  return tzFormat(asUtc, "yyyy-MM-dd");
}

export function userMidnightUtc(tz: string, at: Date = new Date()): Date {
  const local = utcToZonedTime(at, tz);
  const localStart = startOfDay(local);
  return zonedTimeToUtc(localStart, tz);
}

export function toUserLocal(tz: string, at: Date): Date {
  return utcToZonedTime(at, tz);
}

export function formatForUser(tz: string, at: Date, pattern = "yyyy-MM-dd HH:mm"): string {
  return tzFormat(utcToZonedTime(at, tz), pattern, { timeZone: tz });
}

export function isWithinUserToday(tz: string, at: Date = new Date()): boolean {
  const start = userMidnightUtc(tz, at);
  const nextStart = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return at >= start && at < nextStart;
}
```

- If a similar module already exists, propose a diff to consolidate.

### 4. Replace ad-hoc “day” calculations
- For every audited site (from step 1):
  - Replace direct date math with calls to `dates.ts` helpers.
- Provide per-file diffs in the checklist.

### 5. Profile timezone
- Detect if `profiles.timezone` exists.
- If not found in SQL, propose this stub migration:
  `sql/optional_add_timezone.sql`
  ```sql
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
  ```
- Do not assume it is required until confirmed.

### 6. Notifications & scheduling (proposal only)
- Identify where local notifications or server reveals rely on dates.
- Propose updating them to use `userMidnightUtc(tz)` as the anchor.
- Do not modify Supabase code directly; just document proposed changes.

### 7. Tests
- Propose `src/lib/dates.test.ts` in Jest with cases:
  - Time zones: UTC, New_York, Tokyo
  - DST transitions (spring forward, fall back)
  - Round-trips: UTC → tz → day key → back

### 8. Documentation
- Propose `docs/timezone_guidelines.md` covering:
  - Always use `dates.ts` helpers
  - Definition of “today”
  - How to store/display times
  - Rules for contributors

---

## Deliverables (before approval)
1. `docs/timezone_audit.md`
2. Proposed `package.json` diff
3. Proposed `src/lib/dates.ts`
4. Per-file replacement diffs
5. `sql/optional_add_timezone.sql` stub
6. Proposed `src/lib/dates.test.ts`
7. Outline for `docs/timezone_guidelines.md`

---

## Guardrails
- Do not touch secrets.
- Do not bump unrelated dependencies.
- Do not modify RPCs or migrations until confirmed.
- Keep audit filtered to daily logic only.
- Output everything in one consolidated checklist for my review.

---

## Commit message (after approval)
If I approve changes, apply them under:
```
feat(timezones): centralize tz logic and enforce user-local day boundaries
```
