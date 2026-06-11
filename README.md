# Blocade

A fast 1v1 mobile strategy game: race across a 9×9 board while placing roadblocks to trap and delay your rival (wall-race / Quoridor-style rules).

A playable offline build on Expo / React Native (SDK 54): all six screens from the "Paper District" design handoff, now backed by a real rules engine with bot opponents and local pass-and-play.

> **Find your way. Block theirs.**

## Run it

```sh
npm install
npx expo start   # press i / a, or scan the QR with Expo Go
npm test         # run the engine unit tests (31 cases)
```

Designed portrait-only at iPhone-class sizes (390×844 reference).

## How to play

A 9×9 race. **You (blue)** start bottom-centre and win by reaching the top row; the **rival (orange)** starts top-centre and wins on the bottom row. Each turn you take **one** action — move one cell, or place one of your **10 roadblocks** between tiles to lengthen the other side's route. You can jump a directly-adjacent opponent, and side-step diagonally when that jump is walled off. A roadblock can never fully trap either player — the engine checks both still have a route before allowing it.

## Game modes

- **Play Bots** (default) — pick a rival from the roster; difficulty segment scales how sharp it plays.
- **Pass & Play** — local 2-player on one device; the active player's card lights up.

## Bots

Twelve rivals across three tiers, each a real AI personality (not just Easy/Medium/Hard):

| Style | Behaviour | Examples |
|---|---|---|
| `random` | simple/random legal moves, occasional walls | Pebble, Momo |
| `runner` | beelines the shortest route, rarely blocks | Tuk, Juno |
| `blocker` | over-places walls to slow you down | Mads, Sable |
| `balanced` | runs when ahead, blocks when behind | Riko-9, Echo |
| `strategic` | scores every action by route advantage | Vex, Onyx, Nyx, Warden |

## Screens

| Route | Screen |
|---|---|
| `/` | **Home** — profile row, brand mark, stats strip, Play Bots / Pass & Play CTAs, bottom nav |
| `/play-bots` | **Play Bots** — featured rival with taunt bubble, 12-bot roster in 3 tiers, beaten/locked states, sticky panel with difficulty segments + green Play button |
| `/game` | **Game** — rival card, 9×9 board with pieces, walls and mid-drag snap preview, two-well block tray, your card with YOUR MOVE chip |
| `/result` | **Result** — sheet over the real final board; win = brass ring + confetti, loss = darker scrim; live turns / blocks / margin stats |
| `/how-to-play` | **How to Play** — 3 swipeable rule cards with 5×5 diagram boards |

Flow: Home → Play Bots → Game → Result → Run it back / Choose another rival / Home. **Rematch** remounts a fresh match; the result screen reads the real final board and stats (turns, blocks used, route margin).

On the Game screen: **tap a marked cell** to move, or **tap a tray well** (H or V) to arm a roadblock — then tap between tiles to aim and tap again to place. Illegal actions show a message and never cost you the turn.

## Architecture

The rules are pure and UI-free, so the same engine can later drive online play, replays, and daily puzzles:

```
src/
  engine/              ← pure TypeScript game core (no React)
    rules.ts             state, legal moves, jumps/side-steps, wall + BFS no-trap validation, win
    bots.ts              5 AI styles scored on route advantage
    __tests__/           31 unit tests (npm test)
  hooks/use-game.ts    turn flow, wall preview, feedback messages, bot scheduling
  state/match-store.ts in-memory record of the last match for the result screen
  app/                 expo-router screens (_layout loads fonts)
  components/          Board (tappable), BlockTray (tappable wells), PlayerCard, …
  constants/
    theme.ts           design tokens (colors, gradients, fonts, radii, shadows)
    game-data.ts       bot roster + personalities, board geometry helpers
assets/fonts/          Clash Display (500/600/700) + Satoshi (400/500/700/900 + italic)
```

All fixed pixel values come straight from the mock (390px reference) and are scaled with `s()` in `theme.ts`.

## Design rules baked in

- **Blue = you, orange = the rival** — everywhere, no exceptions.
- **Green appears exactly once per screen**: only on the button that starts a match.
- Clash Display for the wordmark, titles, and numbers that matter (never below 17px); Satoshi for everything else.
- Bottom nav on Home and Play Bots only — never during a match.
- Bot mascots are intentional placeholders for real character art (swappable rounded-square slots, gradient identity colors).

## Not built yet (per brief)

No backend, accounts, payments, ads, or online multiplayer. Profile tab is a stub; ratings on the result screen are cosmetic (not persisted). Roadblock placement is tap-to-aim rather than drag-and-drop. Future direction: Daily Route puzzles, ranked leagues, online duels, cosmetics, and post-match analysis.
