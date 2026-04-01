# Roadmap: DCA Uniswap Hooks

**Created:** 2026-03-31
**Granularity:** Coarse (4 phases)
**Current phase:** None started

## Phase 1: Smart Contract (DCAHook.sol)

**Goal:** Deploy a working DCA hook contract on Base that creates, executes, and withdraws DCA orders.

**Requirements:** SC-01 through SC-09

**Plans:**
1. Foundry project scaffold + Uniswap v4 dependencies + DCAHook.sol with order storage, `afterSwap` execution, create/withdraw functions
2. Foundry tests (unit + fuzz for decimal handling) + Base deployment script + CREATE2 salt mining

**Dependencies:** None (can run in parallel with Phase 2)

---

## Phase 2: Frontend Shell + Wallet

**Goal:** Next.js app with dark green DeFi theme, sidebar navigation, and wallet connection on Base.

**Requirements:** FE-01 through FE-04

**Plans:**
1. Next.js 15 scaffold + Tailwind 4 + shadcn/ui + RainbowKit + dark green theme + sidebar layout with 3 pages

**Dependencies:** None (can run in parallel with Phase 1)

---

## Phase 3: Core Pages (Setup + Management + Dashboard)

**Goal:** All three pages functional with real onchain data from the deployed hook contract.

**Requirements:** SETUP-01 through SETUP-07, MGMT-01 through MGMT-06, DASH-01 through DASH-04

**Plans:**
1. DCA Setup page -- token selector, amount/interval/duration inputs, approve+deposit flow
2. DCA Management page -- position list, status tracking, withdraw, tx links
3. Dashboard page -- aggregate stats, active count, next execution, token logos

**Dependencies:** Phase 1 (contract ABI + address), Phase 2 (frontend shell)

---

## Phase 4: UX Polish

**Goal:** Production-ready feel with loading states, token logos, USD values, and explorer links everywhere.

**Requirements:** UX-01 through UX-04

**Plans:**
1. Per-button loading states, token logo fetching, USD price display, BaseScan links on all transactions

**Dependencies:** Phase 3 (pages must exist)

---

## Execution Strategy

```
WAVE 1 (parallel): Phase 1 (Contract) + Phase 2 (Frontend Shell)
         |
WAVE 2 (parallel): Phase 3 Plans 1, 2, 3 (Setup, Management, Dashboard)
         |
WAVE 3:            Phase 4 (Polish)
```

**Total plans:** 7
**Parallel waves:** 3

---
*Created: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*
