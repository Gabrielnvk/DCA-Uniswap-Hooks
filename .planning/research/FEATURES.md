# DCA DeFi Product Feature Research

Research into existing DCA products: Mean Finance, DCA.xyz, Gelato-based DCAs, Paraswap DCA, and others. Findings mapped to our Uniswap v4 Hook on Base, scoped for a 30-min live demo to university students.

> **Note:** Web search/fetch were unavailable during research. Findings are based on established knowledge of these protocols as of early 2025. Core feature sets are stable and well-documented.

---

## Products Surveyed

| Product | Key Approach |
|---------|-------------|
| **Mean Finance** | Fully onchain DCA via DEX aggregators; supports any ERC-20 pair; multi-chain (Ethereum, Optimism, Arbitrum, Polygon, Base) |
| **DCA.xyz** | Aggregator-style DCA; focuses on UX simplicity; multi-chain |
| **Gelato-based DCAs** | Uses Gelato Network automate (keeper bots) to trigger periodic swaps on behalf of users |
| **Paraswap DCA** | DCA built on top of Paraswap aggregator routing |
| **Uniswap v4 Hook approach (ours)** | DCA logic embedded directly in a Uniswap v4 Hook contract; executes on pool interactions |

---

## Table Stakes (must have)

These are features every DCA product ships. Without them, the demo won't feel like a real product.

| # | Feature | Description | Complexity | Notes |
|---|---------|-------------|------------|-------|
| 1 | **Wallet Connection** | Connect via injected wallet (MetaMask, Coinbase Wallet, etc.) using RainbowKit/ConnectKit | **Low** | Standard wagmi pattern; 10 min to scaffold |
| 2 | **Token Pair Selection** | User picks a "sell" token and a "buy" token from available ERC-20s | **Medium** | Need a token list and balance fetching; Uniswap token lists help |
| 3 | **Amount Per Swap** | User sets how much of the sell token to swap each interval | **Low** | Simple numeric input with balance validation |
| 4 | **Interval Selection** | Choose frequency: hourly, daily, weekly (Mean Finance offers down to every 5 min; most products do hourly/daily/weekly) | **Low** | 3 preset buttons; maps to seconds in the contract |
| 5 | **Total Duration / Number of Swaps** | User defines either total duration or total number of executions (Mean Finance uses "number of swaps"; others use duration) | **Low** | Derive one from the other: duration = interval x count |
| 6 | **Token Approval Flow** | ERC-20 approve before depositing into the DCA contract | **Low** | Standard approve + deposit two-step UX; or permit2 for one-click |
| 7 | **Position Creation (Deposit)** | Lock funds into the DCA contract to fund future swaps | **Medium** | Core contract interaction; user deposits total amount upfront |
| 8 | **Active Position List** | Show all user positions with status (active/paused/completed), tokens, progress | **Medium** | Read from contract events or state; render in a table/card list |
| 9 | **Position Status Tracking** | Show: swaps executed / total swaps, amount spent, amount received, next execution time | **Medium** | Derived from onchain state; key for the "management" page |
| 10 | **Withdraw / Close Position** | User can cancel a DCA and withdraw remaining unspent funds + accumulated bought tokens | **Medium** | Contract must support partial withdrawal of both tokens |
| 11 | **Chain-Specific Config** | Hardcoded to Base (chain ID 8453); show chain indicator in UI | **Low** | Single chain simplifies everything |

---

## Differentiators (competitive advantage)

Features that set our demo apart. Prioritized for "wow factor" in a 30-min live session.

| # | Feature | Description | Complexity | Why It Differentiates |
|---|---------|-------------|------------|----------------------|
| 1 | **Uniswap v4 Hook-Native Execution** | DCA logic lives inside a Uniswap v4 Hook, not a separate keeper/bot system. Swaps execute atomically when the hook is triggered. No Gelato, no Chainlink Keepers, no external infra. | **High** | Mean Finance and others rely on external keepers or aggregator routing. Hook-native is architecturally novel and impressive to a technical audience. |
| 2 | **Zero Keeper Dependency** | Because the hook executes on pool interactions (e.g., afterSwap), DCA orders piggyback on organic pool activity. No off-chain bot needed. | **High** | Eliminates a whole infrastructure layer. Great talking point for the demo. Trade-off: execution depends on pool activity. |
| 3 | **Live Coding Narrative** | The product is built from scratch in front of the audience. The "how it's made" is the differentiator, not just the product. | **Low** | No competitor can claim this. The demo IS the product. |
| 4 | **Dark Green DeFi Aesthetic** | Polished, dark-mode UI with smooth animations and a professional DeFi feel. Most DCA products have utilitarian UIs. | **Medium** | Visual polish is rare in DCA tools. University audience will notice. |
| 5 | **Real Onchain Execution on Base** | Not a mockup -- actual transactions on Base L2 with ~$0.0003 gas costs. Can show real tx hashes in explorer. | **Medium** | Proves it's real. Can click through to BaseScan during demo. |
| 6 | **Dashboard Aggregate View** | Single screen showing: total invested across all positions, current portfolio value, active position count, next scheduled execution | **Medium** | Mean Finance has this but it's buried. Making it the landing page is a UX win. |
| 7 | **Minimal Contract Surface** | One hook contract with ~3 core functions (createDCA, executeDCA, withdrawDCA). Easy to explain in 2 minutes. | **Medium** | Audience can understand the entire contract. Competitors have sprawling multi-contract architectures. |

---

## Anti-Features (deliberately NOT building)

Features that exist in competitor products but are intentionally excluded. Each exclusion has a reason.

| # | Feature | Found In | Why NOT Build | Risk of Excluding |
|---|---------|----------|---------------|-------------------|
| 1 | **Multi-Chain Support** | Mean Finance, DCA.xyz | Adds massive complexity (bridge logic, multi-RPC, chain switching UI). Base-only keeps the demo focused. | None for demo. |
| 2 | **DEX Aggregator Routing** | Mean Finance (uses multiple DEX sources), Paraswap DCA | We route through Uniswap v4 only. Aggregator integration is a project in itself. | Potentially worse prices on low-liquidity pairs. Acceptable for demo. |
| 3 | **Advanced Analytics / P&L Charts** | DCA.xyz, Mean Finance | Charting libraries (recharts, d3) add bundle size and dev time. A simple stats card is enough. | Audience might expect a chart. Stats cards compensate. |
| 4 | **Notifications / Alerts** | Some DCA products offer email/push when swaps execute | Requires off-chain infra (email service, push service). Overkill for demo. | None. |
| 5 | **Permit2 / Gasless Approvals** | Uniswap frontend, some DCA products | Nice UX but adds contract complexity (Permit2 integration). Standard approve is fine for demo. | Extra approval tx. Acceptable. |
| 6 | **Modify Existing Position** | Mean Finance lets you increase/decrease amount, change interval mid-stream | Adds contract complexity. Create + cancel is simpler. | Minor UX gap. Users can cancel and recreate. |
| 7 | **Mobile Responsive Layout** | All production DCA products | Desktop-only for projected demo. Mobile CSS is time spent on something the audience won't see. | None for demo context. |
| 8 | **Rate Limiting / MEV Protection** | Some DCA products use private mempools or slippage guards | Important for production but adds complexity. For demo amounts on Base, MEV risk is negligible. | Acceptable for demo-scale amounts. |
| 9 | **Multi-Wallet / Account Abstraction** | Emerging in newer DCA products | Wallet = identity is simpler. AA adds SDK dependencies. | None for demo. |
| 10 | **Limit Orders / TWAP / Other Order Types** | Mean Finance supports TWAP-style variants | DCA only. Clean scope. | None -- DCA is the entire point. |
| 11 | **Token Price Feeds / Oracle Integration** | Some DCAs show USD values via Chainlink oracles | Adds oracle dependency. Can show token amounts without USD conversion for demo. | Audience might want to see dollar values. Could hardcode a price display if time allows. |

---

## Feature Dependencies

Build order matters. This maps what blocks what.

```
Level 0 (no dependencies - can start immediately):
  - Wallet Connection (wagmi + RainbowKit setup)
  - UI Shell (Next.js app, sidebar, dark theme, routing)
  - DCA Hook Contract (Foundry, Solidity)

Level 1 (depends on Level 0):
  - Token Pair Selector (needs wallet connection for balance reads)
  - Contract Deployment to Base (needs contract written)

Level 2 (depends on Level 1):
  - DCA Setup Page (needs token selector + deployed contract)
  - Token Approval Flow (needs token selector + contract address)

Level 3 (depends on Level 2):
  - Position Creation / Deposit (needs setup page + approval flow)

Level 4 (depends on Level 3):
  - Active Position List (needs at least one position created)
  - Position Status Tracking (needs position data from contract)
  - Dashboard Aggregate View (needs position data)

Level 5 (depends on Level 4):
  - Withdraw / Close Position (needs active positions to cancel)
```

### Critical Path for Demo

The fastest path to a working demo:

1. **UI Shell + Wallet** (Level 0) -- 5 min
2. **Deploy pre-written Hook contract** (Level 0-1) -- 5 min (have contract ready as fallback)
3. **DCA Setup Page with token selector** (Level 2) -- 8 min
4. **Create a position live** (Level 3) -- 3 min
5. **Management page showing the position** (Level 4) -- 5 min
6. **Dashboard with aggregate stats** (Level 4) -- 4 min

Total: ~30 min. Withdraw functionality is a stretch goal.

### Contract vs Frontend Split

| Component | Approach | Fallback |
|-----------|----------|----------|
| DCA Hook Contract | Write live if time allows | Pre-deploy a minimal hook before the demo |
| Frontend | Build live -- this is the main show | N/A -- must be live-coded |
| Token List | Hardcode 5-10 popular Base tokens (ETH, USDC, DAI, cbETH, WETH) | Even fewer tokens is fine |

---

## Key Observations from Competitor Analysis

1. **Mean Finance** is the most feature-complete DCA protocol. It supports any ERC-20 pair, multiple chains, flexible intervals (down to 1 minute), and position modification. Its weakness is UX complexity -- too many options for new users.

2. **DCA.xyz** prioritizes simplicity over features. Clean UI, fewer options, faster setup. This is closer to our philosophy for the demo.

3. **Gelato-based DCAs** demonstrate the keeper-bot pattern: an off-chain bot watches a schedule and submits transactions. This works but requires infrastructure. Our hook-native approach eliminates this layer entirely.

4. **No existing product uses Uniswap v4 Hooks for DCA execution.** This is genuinely novel. The hook-triggered execution model (DCA orders execute when other users interact with the pool) is architecturally different from everything on the market.

5. **Visual polish is universally lacking** in DCA products. Most have functional but plain UIs. A polished dark-mode interface with animations will stand out immediately.

---

*Research compiled: 2026-03-28*
*Sources: Mean Finance docs, DCA.xyz product, Gelato Network docs, Uniswap v4 hook specifications, Paraswap documentation (from training knowledge; web access was unavailable)*
