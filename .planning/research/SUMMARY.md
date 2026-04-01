# DCA Uniswap Hooks -- Research Summary

## Stack Decision

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript 5.6
- **Wallet**: RainbowKit 2 + wagmi 2 + viem 2 (dark theme out of box)
- **UI**: shadcn/ui + Tailwind CSS 4 (dark green DeFi palette)
- **Contracts**: Foundry + Uniswap v4-core/v4-periphery (v4-template scaffold)
- **No state management lib** -- wagmi + React Query handles everything
- **No subgraph** -- direct contract reads for 3-page demo
- **No Hardhat** -- Uniswap v4 ecosystem is Foundry-first

## Table Stakes (must ship)

1. Wallet connection (RainbowKit, Base chain)
2. Token pair selector (any ERC-20)
3. Amount per swap + interval selection (hourly/daily/weekly)
4. Total duration / number of swaps
5. Token approval + deposit flow
6. Active position list with status tracking
7. Withdraw / close position
8. Dashboard aggregate stats

## Key Differentiator

**Uniswap v4 Hook-native DCA** -- orders piggyback on organic pool activity via `afterSwap` callback. No Gelato, no Chainlink Keepers, no external infrastructure. Architecturally unique across all surveyed products (Mean Finance, DCA.xyz, Gelato-based DCAs, Paraswap).

Secondary differentiators: visual polish, real onchain execution on Base, minimal contract surface (~3 functions), live coding narrative.

## Architecture

```
Frontend (Next.js) --wagmi/viem--> Base L2 --> PoolManager --> DCAHook.sol
                                                                    ^
                                                          Keeper bot (cron)
```

- **DCAHook.sol**: stores orders, checks timing in `afterSwap`, executes due orders
- **Keeper bot**: Node.js + viem cron script calls `executeDueOrders()` as fallback
- **Frontend reads**: direct contract view functions (`getOrder`, `getUserOrderIds`)
- **Token strategy**: upfront deposit (user sends total amount on position creation)
- **Build order**: Contract + Frontend shell (parallel) -> Integration -> Keeper -> Polish

## Critical Pitfalls (must address in Phase 1)

| ID | Pitfall | Severity |
|----|---------|----------|
| P1 | USDC 6 decimals -- use `decimals()` dynamically, never hardcode 1e18 | Critical |
| P2 | SafeERC20 required for all token transfers (USDT doesn't return bool) | Critical |
| P3 | Hook must verify `msg.sender == poolManager` on all callbacks | Critical |
| P4 | Avoid `beforeSwapReturnDelta` permission (NoOp rug pull risk) | Critical |
| P5 | Flash accounting deltas must sum to zero | Critical |
| P6 | No onchain timers -- need explicit keeper/trigger mechanism | High |
| P7 | Never use slot0 price as oracle -- use slippage tolerances | High |
| P8 | Use Permit2 pattern, not legacy approve | High |
| P10 | Hook address requires CREATE2 salt mining (HookMiner) | Medium |

## Anti-Features (NOT building)

Multi-chain, DEX aggregation, analytics charts, notifications, mobile layout, Permit2 complexity, position modification, MEV protection, account abstraction, other order types, oracle price feeds.

---
*Synthesized: 2026-03-31*
