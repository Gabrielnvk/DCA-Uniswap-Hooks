# DCA Uniswap Hooks

## What This Is

A Dollar-Cost Averaging (DCA) interface built on Uniswap v4 Hooks deployed on Base. Users connect their wallet, configure recurring token swaps at fixed intervals (hourly, daily, weekly), and monitor active positions from a polished dashboard. Built as a live demo product for a university audience of technical and non-technical students.

## Core Value

A visually polished, fully onchain DCA experience that makes automated token accumulation feel effortless — connect, configure, forget.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Uniswap v4 Hook contract on Base that executes DCA swaps at configurable intervals (hourly/daily/weekly)
- [ ] Wallet connection (RainbowKit or similar) with Base chain support
- [ ] Token pair selector — any ERC-20 pair available on Uniswap v4
- [ ] DCA Setup page — select token pair, amount per swap, interval, total duration
- [ ] DCA Management page — list active/paused/completed DCAs with status, progress, next execution time
- [ ] Dashboard overview page — aggregate stats (total invested, current value, active positions count, next scheduled execution)
- [ ] Sidebar navigation with three sections: Dashboard, DCA Setup, DCA Management
- [ ] Dark mode, minimalist UI with dark green DeFi aesthetic
- [ ] Visual polish — smooth animations, transitions, production-ready feel
- [ ] Real onchain execution on Base — not mocked

### Out of Scope

- Mobile-responsive layout — desktop-first for demo
- Multi-chain support — Base only
- Advanced analytics/charting — keep it simple
- User authentication beyond wallet — wallet is identity
- Notifications/alerts — not needed for demo
- Limit orders or other order types — DCA only

## Context

- **Audience**: University students (mixed technical/non-technical) watching a 30-min live vibe coding session
- **Purpose**: Demonstrate building a real DeFi product from scratch with AI-assisted development
- **Ethereum knowledge loaded**: ETHSKILLS (gas costs, tooling, security patterns) + Uniswap AI (v4 hooks security, swap integration, viem patterns)
- **Base chain**: Cheapest major L2, ~$0.0003 per transfer — ideal for demo
- **Uniswap v4 Hooks**: Allow custom logic (like DCA scheduling) attached to pools
- **Smart contract approach**: Build a DCA hook if time allows; fallback to pre-deployed contracts if needed

## Constraints

- **Timeline**: Must be demo-ready — built in a single session, presentable tomorrow in 30 min live
- **Stack**: Next.js + wagmi/viem + Foundry (for contracts)
- **Chain**: Base (chain ID 8453)
- **Visual priority**: Polish > features — this is a demo, first impression matters
- **Contract complexity**: Keep the hook minimal — schedule + execute swaps, nothing more

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js + wagmi/viem | Modern, widely understood, fast to scaffold | — Pending |
| Base chain | Cheapest L2, good Uniswap v4 support | — Pending |
| Any token pair support | More impressive for demo than single pair | — Pending |
| Fully onchain (not mocked) | Shows real DeFi capability to audience | — Pending |
| Dark green DeFi aesthetic | Matches DeFi conventions, looks professional | — Pending |
| 3-page sidebar (Dashboard/Setup/Management) | Clean information architecture, easy to navigate during demo | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-31 after initialization*
