# DCA + Uniswap v4 Hooks on Base: Known Pitfalls

Research compiled for the DCA Uniswap Hooks project. Each pitfall is specific to the intersection of Dollar-Cost Averaging, Uniswap v4 Hooks, and the Base L2.

---

## P1: USDC Decimal Mismatch (6 vs 18)

**Severity: Critical**

USDC on Base uses 6 decimals. Most ERC-20 tokens use 18. DCA systems that hardcode `1e18` as the unit or assume uniform decimals across token pairs will silently send 1,000,000,000,000x too much or too little per swap. Since DCA is about fixed-amount recurring purchases, getting the amount wrong on every single execution compounds the damage across the entire position lifetime.

**Warning signs:**
- Any hardcoded `1e18` or `10**18` in amount calculations
- Using `parseEther()` for non-ETH tokens
- No `decimals()` call before constructing swap amounts
- Tests that only use 18-decimal mock tokens

**Prevention strategy:**
- Always call `IERC20Metadata(token).decimals()` and scale amounts dynamically
- In the frontend, use viem's `parseUnits(amount, decimals)` instead of `parseEther`
- Store DCA amounts in human-readable form (e.g., "100 USDC") and convert to raw units at execution time
- Write explicit tests with 6-decimal tokens (USDC, USDT) paired against 18-decimal tokens

**Build phase:** Phase 1 (Contract) and Phase 2 (Frontend) -- must be correct from the first line of amount handling code.

---

## P2: Missing SafeERC20 for Token Transfers

**Severity: Critical**

USDT's `transfer()` and `approve()` do not return a `bool`. A raw `IERC20(token).transfer(...)` call will revert on USDT because Solidity expects a return value that never arrives. Since DCA supports "any ERC-20 pair," the contract must handle non-standard tokens. A single failed transfer silently breaks a user's entire DCA schedule.

**Warning signs:**
- Direct `IERC20(token).transfer()` or `.transferFrom()` calls without SafeERC20
- No `using SafeERC20 for IERC20;` declaration
- Approval calls using `token.approve()` instead of `safeApprove` or `forceApprove`

**Prevention strategy:**
- Import and use OpenZeppelin's `SafeERC20` library for every token interaction
- Use `safeTransfer`, `safeTransferFrom`, and `forceApprove` (not `safeApprove`, which has its own issues with non-zero to non-zero approval)
- In v4 hooks context, token settlement goes through PoolManager, but any direct token pulls from users still need SafeERC20

**Build phase:** Phase 1 (Contract) -- apply from the first token interaction.

---

## P3: Hook Caller Verification (msg.sender != PoolManager)

**Severity: Critical**

Uniswap v4 hooks are called by the PoolManager. If a hook function does not verify `msg.sender == address(poolManager)`, anyone can call `beforeSwap`, `afterSwap`, etc. directly. For a DCA hook, this means an attacker could trigger fake swap callbacks, manipulate internal DCA accounting, or drain user funds by spoofing execution events.

**Warning signs:**
- Hook functions (`beforeSwap`, `afterSwap`, `beforeInitialize`, etc.) missing a sender check
- No `onlyPoolManager` modifier or equivalent
- Tests that call hook functions directly without going through the PoolManager

**Prevention strategy:**
- Inherit from Uniswap's `BaseHook` which includes the `onlyPoolManager` modifier
- Apply `onlyPoolManager` to every hook callback without exception
- If writing a custom base, add `require(msg.sender == address(poolManager))` as the first line of every hook function
- Test that direct calls to hook functions revert

**Build phase:** Phase 1 (Contract) -- structural requirement before any hook logic.

---

## P4: beforeSwapReturnDelta Abuse (NoOp Rug Vector)

**Severity: Critical**

The `beforeSwapReturnDelta` permission in v4 hooks allows the hook to return a delta that modifies or completely replaces the swap. A hook with this flag can intercept a user's swap, return a delta that gives them nothing, and pocket the input tokens. For a DCA hook, if this permission is enabled, every automated swap execution becomes a potential rug pull surface.

**Warning signs:**
- Hook flags include `BEFORE_SWAP_RETURNS_DELTA`
- The hook modifies `amountSpecified` or returns non-zero `BeforeSwapDelta`
- No clear justification in comments for why the hook needs to alter swap amounts
- Hook takes custody of tokens during `beforeSwap`

**Prevention strategy:**
- Do NOT enable `beforeSwapReturnDelta` unless absolutely required by the DCA design
- Prefer using `afterSwap` for DCA accounting -- it observes completed swaps without altering them
- If the DCA hook triggers swaps (rather than modifying user swaps), it should initiate swaps through the PoolManager as a separate action, not intercept existing ones
- If `beforeSwapReturnDelta` is needed, document exactly why and audit the delta math exhaustively

**Build phase:** Phase 1 (Contract) -- decide hook permissions in architecture, before writing logic.

---

## P5: Delta Accounting Imbalance (sum != 0)

**Severity: Critical**

Uniswap v4 uses a "flash accounting" model where all token deltas within a callback must net to zero. If your DCA hook triggers a swap inside a hook callback and the deltas do not balance, the entire transaction reverts. This is subtle because DCA involves pulling tokens from users, swapping, and delivering output -- three separate delta operations that must sum to zero within the PoolManager's accounting.

**Warning signs:**
- Hook calls `poolManager.swap()` inside a callback without settling all deltas
- Using `take()` without a corresponding `settle()` (or vice versa)
- Token amounts pulled from users do not match what is provided to the swap
- Transactions revert with `CurrencyDeltaNotZero` or similar errors

**Prevention strategy:**
- Map out every delta operation on paper before coding: user -> hook (pull input), hook -> pool (swap input), pool -> hook (swap output), hook -> user (deliver output)
- Use `poolManager.settle()` and `poolManager.take()` correctly for each currency
- Write integration tests that verify successful end-to-end swap execution through the hook, not just unit tests of individual functions
- Use the `CurrencyLibrary` and `BalanceDelta` helpers from v4-core

**Build phase:** Phase 1 (Contract) -- core swap execution logic.

---

## P6: No Onchain Cron -- DCA Execution Trigger Problem

**Severity: High**

Smart contracts cannot execute themselves on a schedule. There is no `setTimeout` or cron in the EVM. A DCA system that assumes swaps "just happen" at the configured interval will never execute. This is the single most common architectural mistake in DCA protocol design.

**Warning signs:**
- No keeper/automation design in the architecture
- Hook logic has time checks (`block.timestamp >= nextExecution`) but no mechanism to call it
- Frontend assumes the contract "runs" periodically
- No discussion of Chainlink Keepers, Gelato, or similar automation services

**Prevention strategy (choose one):**
- **Piggyback model (simplest for demo):** Execute pending DCA orders whenever any user interacts with the pool. Use `afterSwap` to check if any DCA positions are due and execute them. Downside: execution only happens when the pool has activity.
- **Keeper model:** Use Gelato Network or Chainlink Automation on Base to call an `executeDCA()` function at intervals. Costs gas but is reliable.
- **User-triggered model:** Frontend calls `executeDCA(positionId)` and anyone can call it. Incentivize with a small keeper fee taken from the DCA amount. Simplest to build for a demo.
- For the demo scope, the user-triggered model is most practical. Show a "Execute Now" button and explain that production would use Gelato/Chainlink.

**Build phase:** Phase 1 (Contract architecture) -- must decide the trigger model before writing any scheduling logic.

---

## P7: Using DEX Spot Price as Oracle

**Severity: High**

If the DCA hook checks the current pool price to calculate slippage bounds, minimum output, or position valuations, it is vulnerable to flash loan manipulation. An attacker can: (1) flash-borrow massive amounts, (2) skew the pool price, (3) trigger a DCA execution at the manipulated price, (4) repay the flash loan. The DCA user gets a terrible fill.

**Warning signs:**
- Reading `slot0().sqrtPriceX96` inside the hook to determine swap parameters
- Using pool price to calculate `amountOutMinimum`
- Displaying "current value" on the dashboard using only onchain spot price
- No TWAP or external oracle reference

**Prevention strategy:**
- For swap execution: use a reasonable slippage tolerance (e.g., 0.5-1%) set by the user at DCA creation time, not derived from the current spot price
- For the dashboard: use the Uniswap v4 Oracle hook or an offchain price feed (Coingecko API, etc.) for display purposes only
- If onchain price reference is needed, use the v4 Oracle hook's TWAP observations (time-weighted average) which are resistant to single-block manipulation
- For the demo: a hardcoded slippage tolerance per position is sufficient and safe

**Build phase:** Phase 1 (Contract) for slippage parameters, Phase 2 (Frontend) for price display.

---

## P8: Token Approval Model -- approve() vs Permit2

**Severity: High**

Uniswap v4 on Base uses Permit2 for token approvals. If the DCA contract uses the legacy `approve()` pattern, users must submit a separate approval transaction for each token, and the contract holds an unlimited allowance forever. Permit2 allows single-use, time-bounded, batched approvals. Getting this wrong means either: (a) the DCA contract silently fails because it cannot pull tokens, or (b) users grant unlimited approvals to an unaudited contract.

**Warning signs:**
- Contract calls `transferFrom` expecting legacy approval
- Frontend calls `token.approve(dcaContract, MAX_UINT256)`
- No integration with Permit2 contract on Base (`0x000000000022D473030F116dDEE9F6B43aC78BA3`)
- Users need two transactions (approve + create position) instead of one

**Prevention strategy:**
- Integrate with Permit2 from the start: user approves Permit2 once per token, then signs permit messages for each DCA position
- Use `IPermit2.permitTransferFrom()` for pulling tokens into the DCA contract
- In the frontend, use wagmi's `useSignTypedData` to get the permit signature, then bundle it with the DCA creation call
- For the demo, if Permit2 is too complex, use legacy approve but limit the allowance to the exact DCA total amount (not MAX_UINT256)

**Build phase:** Phase 1 (Contract) for the pull mechanism, Phase 2 (Frontend) for the approval UX.

---

## P9: Base L2 Sequencer Downtime and Timestamp Reliability

**Severity: Medium**

Base is an L2 with a centralized sequencer. If the sequencer goes down, no transactions execute, meaning DCA swaps scheduled during downtime are missed. When the sequencer comes back, `block.timestamp` jumps forward. A naive DCA implementation that checks `timestamp >= lastExecution + interval` will try to execute only one swap even if multiple intervals were missed during downtime.

**Warning signs:**
- DCA execution logic only executes one swap per call regardless of elapsed time
- No handling for "catch-up" executions after a gap
- Using `block.timestamp` comparisons without considering L2 timestamp behavior
- No maximum staleness check

**Prevention strategy:**
- Calculate `missedExecutions = (block.timestamp - lastExecution) / interval` and either execute multiple swaps or skip to current time (design choice)
- For the demo: skip to current time (execute one swap, reset timer) -- simpler and avoids gas spikes from batch execution
- Document the tradeoff: skip-to-current protects against gas spikes but means users miss DCA entries during downtime
- Add a `maxExecutionsPerCall` cap to prevent gas limit issues if many intervals were missed

**Build phase:** Phase 1 (Contract) -- part of the timing logic.

---

## P10: Hook Address Mining (CREATE2 Flag Encoding)

**Severity: Medium**

Uniswap v4 encodes hook permissions in the hook contract's address. The leading bits of the address must match the flags the hook declares. You cannot simply deploy a hook to any address -- you must mine a salt that produces an address with the correct leading bits via CREATE2. If you deploy without the correct address, the PoolManager will reject the hook.

**Warning signs:**
- Deploying the hook with a regular `new DCAHook()` instead of CREATE2
- Hook deployment reverts or pool initialization reverts with "invalid hook address"
- No salt-mining script in the deployment tooling
- Confusion about why the hook "doesn't work" after deployment

**Prevention strategy:**
- Use the `HookMiner` library from `v4-periphery` to find a valid salt
- In Foundry tests, use `deployCodeTo()` or `vm.etch()` to place the hook at the correct address
- Write a deployment script that mines the salt before deploying: `HookMiner.find(deployer, flags, creationCode, constructorArgs)`
- For Base deployment, pre-mine the salt locally (can take seconds to minutes depending on the number of flags)

**Build phase:** Phase 1 (Contract) -- deployment tooling, needed before any testnet deployment.

---

## P11: Reentrancy Through Hook Callbacks

**Severity: Medium**

Uniswap v4 hooks receive callbacks from the PoolManager during swap execution. If the DCA hook's `afterSwap` triggers another swap (to execute a pending DCA order), this creates a nested callback. The hook must handle reentrancy correctly: updating state before the nested call, using reentrancy guards, or designing the flow to avoid recursion entirely.

**Warning signs:**
- Hook's `afterSwap` calls `poolManager.swap()` without a reentrancy guard
- State variables (e.g., `lastExecutionTime`, `remainingSwaps`) updated after an external call
- No `nonReentrant` modifier on functions that interact with the PoolManager
- Tests pass for single DCA positions but fail or behave unexpectedly with multiple concurrent positions

**Prevention strategy:**
- Use OpenZeppelin's `ReentrancyGuard` on any function that triggers swaps
- Follow checks-effects-interactions: update all DCA position state (decrement remaining swaps, update timestamp) before calling `poolManager.swap()`
- Consider a two-step design: `afterSwap` only marks positions as "ready to execute," and a separate `executePendingDCAs()` function does the actual swaps
- Test with multiple DCA positions on the same pool executing in the same block

**Build phase:** Phase 1 (Contract) -- architecture decision about execution flow.

---

## P12: Gas Limits on Batch DCA Execution

**Severity: Medium**

If multiple DCA positions are due for execution at the same time (e.g., 50 users all set daily DCA on the same pool), executing all of them in a single transaction can exceed the Base block gas limit. The transaction reverts and nobody's DCA executes.

**Warning signs:**
- A loop over all active positions in a single execution function with no bound
- No pagination or per-call limit on how many positions are executed
- Gas usage grows linearly with the number of active positions
- Works in tests with 3 positions, fails on mainnet with 50+

**Prevention strategy:**
- Add a `maxPositions` parameter to the execution function
- Allow callers to specify which position IDs to execute (explicit list, not "execute all")
- Each position should be independently executable: `executeDCA(positionId)` not `executeAllDCAs()`
- For the demo with few positions, this is low risk, but the architecture should support per-position execution from the start

**Build phase:** Phase 1 (Contract) -- execution function signature design.

---

## P13: Frontend Shows Stale or Incorrect Position State

**Severity: Low**

Base blocks are produced every 2 seconds. The frontend can show a DCA position as "pending execution" when it was already executed in the latest block, or show "next execution in 5 minutes" when the sequencer is behind. For a demo, stale data makes the product look broken even when the contracts work correctly.

**Warning signs:**
- Frontend polls position state on a long interval (>10s)
- No loading/pending states during transaction confirmation
- "Next execution" countdown goes negative without updating
- Dashboard totals do not update after a swap is confirmed

**Prevention strategy:**
- Use wagmi's `useWatchContractEvent` to listen for DCA execution events and update state reactively
- After any write transaction, refetch position state on confirmation (wagmi's `onSuccess` callback)
- Show a "confirming..." state between transaction submission and confirmation
- For the demo: manual refresh button as a fallback is acceptable

**Build phase:** Phase 2 (Frontend) -- data fetching layer.

---

## Summary Table

| ID  | Pitfall                              | Severity | Phase   |
|-----|--------------------------------------|----------|---------|
| P1  | USDC 6 decimals vs 18               | Critical | 1 + 2   |
| P2  | Missing SafeERC20                    | Critical | 1       |
| P3  | Hook caller not verified             | Critical | 1       |
| P4  | beforeSwapReturnDelta abuse          | Critical | 1       |
| P5  | Delta accounting imbalance           | Critical | 1       |
| P6  | No onchain cron for DCA              | High     | 1       |
| P7  | DEX spot price as oracle             | High     | 1 + 2   |
| P8  | approve() vs Permit2                 | High     | 1 + 2   |
| P9  | L2 sequencer downtime + timestamps   | Medium   | 1       |
| P10 | Hook address mining (CREATE2)        | Medium   | 1       |
| P11 | Reentrancy through hook callbacks    | Medium   | 1       |
| P12 | Gas limits on batch execution        | Medium   | 1       |
| P13 | Stale frontend state                 | Low      | 2       |
