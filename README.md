# Pick12

Draft-day war room for a 12-team PPR league. Target: **iPad via Expo Go**.

## Setup

```bash
pnpm install
pnpm start
```

Scan the QR code with Expo Go on an iPad (or open the project in Expo Go on the same network).

## Scripts

- `pnpm start` — Metro / Expo Go
- `pnpm typecheck` — strict TypeScript
- `pnpm test` — unit tests (`lib/**/*.test.ts`)
- `pnpm test:e2e` — scripted 180-pick mock draft against `assets/snapshot.json` (offline)

## iPad (Expo Go)

1. pnpm start — same Wi-Fi as the iPad (or expo start --tunnel).
2. Landscape: list | recs split. Rotate: stacked fallback.
3. Log 3 opponent picks (two taps each). Undo.
4. Force-kill Expo Go, relaunch, resume at the same pick.
5. Board: remove a middle pick, fill the hole from the list.
6. Airplane mode: continue drafting (no refresh).
7. Online: Settings → Refresh Rankings (age chip updates). Airplane → Refresh shows banner and keeps old snapshot.

