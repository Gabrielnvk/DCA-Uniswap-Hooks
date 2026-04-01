# Requirements: DCA Uniswap Hooks

**Defined:** 2026-03-31
**Core Value:** A visually polished, fully onchain DCA experience that makes automated token accumulation feel effortless.

## v1 Requirements

### Smart Contract

- [ ] **SC-01**: DCA Hook contract deployed on Base using Uniswap v4 `afterSwap` callback
- [ ] **SC-02**: User can create a DCA order specifying: token pair, amount per swap, interval (hourly/daily/weekly), number of swaps
- [ ] **SC-03**: User deposits total DCA amount upfront into the hook contract
- [ ] **SC-04**: Hook executes due DCA orders when pool swaps occur (piggyback on `afterSwap`)
- [ ] **SC-05**: User can withdraw remaining funds and accumulated tokens from a position
- [ ] **SC-06**: Contract supports any ERC-20 token pair available on Uniswap v4
- [ ] **SC-07**: Contract uses SafeERC20 for all token interactions
- [ ] **SC-08**: Contract verifies `msg.sender == poolManager` on all hook callbacks
- [ ] **SC-09**: Contract handles token decimal differences correctly (6 vs 18)

### Frontend Shell

- [ ] **FE-01**: Next.js 15 app with dark mode, dark green DeFi aesthetic
- [ ] **FE-02**: Sidebar navigation with three sections: Dashboard, DCA Setup, DCA Management
- [ ] **FE-03**: RainbowKit wallet connection configured for Base chain
- [ ] **FE-04**: shadcn/ui components with custom dark green theme

### DCA Setup Page

- [ ] **SETUP-01**: Token pair selector (sell token + buy token) with token search
- [ ] **SETUP-02**: Amount input per swap with balance validation
- [ ] **SETUP-03**: Interval selector (hourly / daily / weekly)
- [ ] **SETUP-04**: Duration input (number of swaps)
- [ ] **SETUP-05**: Token approval + deposit transaction flow
- [ ] **SETUP-06**: Loading state per action button (approve, deposit)
- [ ] **SETUP-07**: BaseScan transaction link after successful creation

### DCA Management Page

- [ ] **MGMT-01**: List all user DCA positions (active, completed, cancelled)
- [ ] **MGMT-02**: Each position shows: token pair, progress (swaps executed / total), amount spent, amount received
- [ ] **MGMT-03**: Each position shows next scheduled execution time
- [ ] **MGMT-04**: User can withdraw/cancel a position
- [ ] **MGMT-05**: Loading state on withdraw button
- [ ] **MGMT-06**: BaseScan link for each executed swap

### Dashboard Page

- [ ] **DASH-01**: Total amount invested across all positions
- [ ] **DASH-02**: Number of active positions
- [ ] **DASH-03**: Next scheduled execution time (soonest across all positions)
- [ ] **DASH-04**: Token logos displayed next to amounts

### UX Polish

- [ ] **UX-01**: Each onchain action button has its own loading/disabled state
- [ ] **UX-02**: Token logos fetched and displayed alongside token symbols
- [ ] **UX-03**: USD values shown next to token amounts
- [ ] **UX-04**: All transaction hashes link to BaseScan

## v2 Requirements

### Enhanced Execution

- **V2-01**: Keeper bot (Node.js + viem) for guaranteed execution when pool is inactive
- **V2-02**: Smooth page transitions with Framer Motion animations

### Advanced Features

- **V2-03**: Position modification (change amount, interval)
- **V2-04**: Historical performance chart per position
- **V2-05**: Multi-chain support (Arbitrum, Optimism)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile-responsive layout | Desktop-first for demo |
| Multi-chain support | Base only -- simplifies everything |
| Analytics/charting | Complexity vs demo time tradeoff |
| Notifications/alerts | Not needed for live demo |
| DEX aggregator routing | Direct Uniswap v4 pool only |
| MEV protection | Overkill for demo; Base has less MEV |
| Account abstraction | Adds complexity, wallet connect is sufficient |
| Permit2 flow | Standard approve is simpler for demo |
| Oracle price feeds | Use slippage tolerance instead |
| Other order types | DCA only -- focused product |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SC-01 | Phase 1 | Pending |
| SC-02 | Phase 1 | Pending |
| SC-03 | Phase 1 | Pending |
| SC-04 | Phase 1 | Pending |
| SC-05 | Phase 1 | Pending |
| SC-06 | Phase 1 | Pending |
| SC-07 | Phase 1 | Pending |
| SC-08 | Phase 1 | Pending |
| SC-09 | Phase 1 | Pending |
| FE-01 | Phase 2 | Pending |
| FE-02 | Phase 2 | Pending |
| FE-03 | Phase 2 | Pending |
| FE-04 | Phase 2 | Pending |
| SETUP-01 | Phase 3 | Pending |
| SETUP-02 | Phase 3 | Pending |
| SETUP-03 | Phase 3 | Pending |
| SETUP-04 | Phase 3 | Pending |
| SETUP-05 | Phase 3 | Pending |
| SETUP-06 | Phase 3 | Pending |
| SETUP-07 | Phase 3 | Pending |
| MGMT-01 | Phase 3 | Pending |
| MGMT-02 | Phase 3 | Pending |
| MGMT-03 | Phase 3 | Pending |
| MGMT-04 | Phase 3 | Pending |
| MGMT-05 | Phase 3 | Pending |
| MGMT-06 | Phase 3 | Pending |
| DASH-01 | Phase 3 | Pending |
| DASH-02 | Phase 3 | Pending |
| DASH-03 | Phase 3 | Pending |
| DASH-04 | Phase 3 | Pending |
| UX-01 | Phase 4 | Pending |
| UX-02 | Phase 4 | Pending |
| UX-03 | Phase 4 | Pending |
| UX-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*
