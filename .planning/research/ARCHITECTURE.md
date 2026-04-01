# DCA on Uniswap v4 Hooks -- Architecture Research

## Component Diagram

```
+------------------------------------------------------------------+
|                          FRONTEND (Next.js)                      |
|                                                                  |
|  +------------------+  +------------------+  +----------------+  |
|  |    Dashboard     |  |    DCA Setup     |  | DCA Management |  |
|  | (aggregate stats)|  | (create orders)  |  | (list/cancel)  |  |
|  +--------+---------+  +--------+---------+  +-------+--------+  |
|           |                     |                     |          |
|           +---------------------+---------------------+          |
|                                 |                                |
|                    wagmi / viem (Base RPC)                        |
+----------------------------------+-------------------------------+
                                   |
                    reads / writes via JSON-RPC
                                   |
+----------------------------------v-------------------------------+
|                     BASE L2 (Chain ID 8453)                      |
|                                                                  |
|  +-----------------------------+                                 |
|  |     PoolManager (singleton) |<-----+                          |
|  |  - manages all v4 pools     |      |                          |
|  |  - calls hook callbacks     |      |                          |
|  +------+----------------------+      |                          |
|         |                             |                          |
|         | beforeSwap / afterSwap      | swap()                   |
|         v                             |                          |
|  +------+----------------------+      |                          |
|  |     DCAHook.sol             |      |                          |
|  |  - stores DCA orders        |      |                          |
|  |  - checks execution timing  |      |                          |
|  |  - executes due orders in   +------+                          |
|  |    afterSwap callback       |                                 |
|  |  - public execute() for     +------+                          |
|  |    keeper-triggered runs    |      |                          |
|  +-----------------------------+      |                          |
|                                       |                          |
+---------------------------------------+--------------------------+
                                        |
                             calls execute()
                                        |
+---------------------------------------+--------------------------+
|                     KEEPER / BOT (offchain)                      |
|                                                                  |
|  - Monitors DCA orders with elapsed intervals                    |
|  - Calls DCAHook.execute() or triggers a swap on the pool        |
|  - Runs on a cron schedule (e.g., every 5 min)                   |
|  - Can be a simple Node.js script with viem                      |
|                                                                  |
+------------------------------------------------------------------+
```

## Uniswap v4 Hook System -- How It Works

### Singleton PoolManager

Uniswap v4 uses a **single PoolManager contract** that manages all pools. This replaces the factory-per-pool model from v3. Key properties:

- All pool state lives inside PoolManager (via transient storage / flash accounting)
- Swaps, liquidity changes, and donations all go through PoolManager
- PoolManager calls hook callbacks at defined points in each operation

### Hook Callbacks Available

Every hook contract specifies which callbacks it wants via permission flags encoded in the hook's address (the last 14 bits). The full callback set:

| Callback                | When Called                        | Relevant to DCA? |
|-------------------------|------------------------------------|-------------------|
| `beforeInitialize`      | Before pool is created             | No                |
| `afterInitialize`       | After pool is created              | No                |
| `beforeAddLiquidity`    | Before LP adds liquidity           | No                |
| `afterAddLiquidity`     | After LP adds liquidity            | No                |
| `beforeRemoveLiquidity` | Before LP removes liquidity        | No                |
| `afterRemoveLiquidity`  | After LP removes liquidity         | No                |
| `beforeSwap`            | Before a swap executes             | Maybe             |
| `afterSwap`             | After a swap executes              | **Yes -- primary** |
| `beforeDonate`          | Before a donation                  | No                |
| `afterDonate`           | After a donation                   | No                |

### Hook Function Signatures (v4)

```solidity
function beforeSwap(
    address sender,
    PoolKey calldata key,
    IPoolManager.SwapParams calldata params,
    bytes calldata hookData
) external returns (bytes4, BeforeSwapDelta, uint24);

function afterSwap(
    address sender,
    PoolKey calldata key,
    IPoolManager.SwapParams calldata params,
    BalanceDelta delta,
    bytes calldata hookData
) external returns (bytes4, int128);
```

### Why `afterSwap` Is the Primary Callback for DCA

The DCA hook uses `afterSwap` because:

1. **Piggyback execution**: When any user swaps on the pool, the hook can check if any DCA orders are due and execute them in the same transaction. This is gas-efficient because someone else is already paying for the base transaction cost.
2. **Known pool state**: After a swap, pool prices and balances are settled, giving accurate pricing for DCA execution.
3. **No frontrunning concern**: DCA orders execute at market price after the triggering swap, not before it.

However, relying solely on `afterSwap` piggyback has a critical limitation: if nobody swaps on the pool, DCA orders never execute. This is why a **keeper** is also needed.

## Data Flow

### 1. Creating a DCA Order

```
User (Frontend)
    |
    | createDCAOrder(tokenIn, tokenOut, amountPerSwap, interval, numExecutions)
    | + approve(tokenIn, hookAddress, totalAmount)
    v
DCAHook.sol
    |
    | stores Order struct in mapping(uint256 => Order)
    | emits OrderCreated(orderId, owner, tokenIn, tokenOut, ...)
    | pulls tokens from user (or user pre-approves for pull-per-execution)
    v
Order stored onchain
```

**Order struct (suggested)**:
```solidity
struct DCAOrder {
    address owner;
    PoolKey poolKey;           // identifies the Uniswap v4 pool
    bool zeroForOne;           // swap direction
    uint256 amountPerExecution; // amount of tokenIn per DCA swap
    uint256 interval;          // seconds between executions (3600, 86400, 604800)
    uint256 lastExecutedAt;    // timestamp of last execution
    uint256 executionsRemaining;
    bool active;
}
```

**Storage pattern**: `mapping(uint256 => DCAOrder) public orders` with an auto-incrementing `nextOrderId`. Per-user index via `mapping(address => uint256[]) public userOrderIds`.

### 2. Executing a DCA Order

Two execution paths:

**Path A -- Piggyback on afterSwap (gas-efficient, opportunistic)**
```
Any user swaps on the pool
    |
    v
PoolManager calls DCAHook.afterSwap()
    |
    | Hook iterates pending orders for this pool
    | For each order where block.timestamp >= lastExecutedAt + interval:
    |   - Pull amountPerExecution of tokenIn from order owner (via approval)
    |   - Execute swap through PoolManager
    |   - Update lastExecutedAt, decrement executionsRemaining
    |   - Emit OrderExecuted(orderId, amountIn, amountOut, timestamp)
    v
DCA swaps complete
```

**Path B -- Keeper-triggered (reliable, guaranteed timing)**
```
Keeper bot (offchain cron)
    |
    | Reads pending orders, finds those past their interval
    | Calls DCAHook.executeDueOrders(orderIds[])
    |   or triggers a minimal swap on the pool to invoke afterSwap
    v
DCAHook.sol
    |
    | For each orderId: validate timing, pull tokens, swap via PoolManager
    | Emit OrderExecuted events
    v
DCA swaps complete
```

**Recommended approach**: Use **Path B as the primary mechanism** with a dedicated `executeDueOrders()` function. Path A (piggyback) is a nice optimization but cannot be relied upon for timing guarantees.

### 3. Reading DCA State from Frontend

**Option A -- Direct contract reads (simplest, recommended for demo)**
```
Frontend
    |
    | contract.read.getOrder(orderId)
    | contract.read.getUserOrders(address)
    | contract.read.getOrderStatus(orderId)
    v
Returns current order state directly from chain
```

**Option B -- Event indexing (better for production)**
```
DCAHook emits events:
    OrderCreated, OrderExecuted, OrderCancelled, OrderCompleted

Indexer (The Graph subgraph or Ponder) listens and indexes

Frontend queries indexed data for historical execution data,
aggregate stats, performance tracking
```

**For this project**: Start with direct contract reads (Option A). The contract should expose view functions like:
- `getOrder(uint256 orderId) -> DCAOrder`
- `getUserOrders(address user) -> uint256[]`
- `getExecutableOrders(PoolKey key) -> uint256[]`

Events should still be emitted for future indexing and for the frontend to detect state changes via `watchContractEvent`.

## Who Triggers DCA Execution

Smart contracts cannot self-execute. There are no timers or cron jobs onchain. Options:

| Trigger Mechanism       | Reliability | Cost        | Complexity | Best For       |
|------------------------|-------------|-------------|------------|----------------|
| **Dedicated keeper bot** | High        | Bot pays gas | Medium     | **This project** |
| Piggyback on afterSwap | Low (depends on pool activity) | Free (other users pay) | Low | Optimization only |
| Chainlink Automation   | High        | LINK fees   | Low        | Production     |
| Gelato Network         | High        | ETH fees    | Low        | Production     |
| User self-triggers     | Unreliable  | User pays   | Lowest     | Fallback       |

**Recommendation for this project**:

1. **Primary**: Simple Node.js keeper script using viem that runs every N minutes, reads due orders, and calls `executeDueOrders()`. Base gas costs are ~$0.0003 per tx, making this extremely cheap.
2. **Secondary**: `afterSwap` piggyback as an optimization -- if someone swaps on the pool anyway, execute due orders for free.
3. **Fallback**: Public `executeOrder(orderId)` function anyone can call (including the order owner from the frontend via a "Execute Now" button).

### Keeper Bot Architecture (minimal)

```
keeper.ts (Node.js script, runs on cron or setInterval)
    |
    | 1. Read all active order IDs from DCAHook
    | 2. Filter to orders where block.timestamp >= lastExecutedAt + interval
    | 3. If any are due: call DCAHook.executeDueOrders(dueOrderIds)
    | 4. Log results, handle errors
    |
    | Runs every 60 seconds (for hourly DCA, 60s polling is fine)
    | Uses a funded wallet on Base (needs ~0.001 ETH for weeks of operation)
```

## Token Approval Strategy

Two approaches for how the hook accesses user funds:

**Approach A -- Upfront deposit (simpler, recommended)**
- User deposits total DCA amount into the hook contract on order creation
- Hook holds funds in escrow
- On cancel, remaining funds returned to user
- Pro: No ongoing approval needed, no risk of failed pulls
- Con: Capital locked up

**Approach B -- Pull per execution (capital efficient)**
- User approves hook for spending tokenIn
- Hook pulls amountPerExecution on each execution
- Pro: User retains custody until execution
- Con: If user revokes approval or runs out of tokens, execution fails

**Recommendation**: Approach A (upfront deposit) for the demo. Simpler UX, fewer failure modes, and for a demo the locked capital concern is irrelevant.

## Key Interfaces Between Components

### 1. DCAHook.sol Public Interface

```solidity
// --- User-facing ---
function createOrder(
    PoolKey calldata key,
    bool zeroForOne,
    uint256 amountPerExecution,
    uint256 interval,        // seconds: 3600 (hourly), 86400 (daily), 604800 (weekly)
    uint256 numExecutions
) external payable returns (uint256 orderId);

function cancelOrder(uint256 orderId) external;

function withdrawOrder(uint256 orderId) external;  // withdraw remaining funds

// --- Keeper-facing ---
function executeDueOrders(uint256[] calldata orderIds) external;

function getExecutableOrderIds() external view returns (uint256[] memory);

// --- View functions (frontend reads) ---
function getOrder(uint256 orderId) external view returns (DCAOrder memory);

function getUserOrderIds(address user) external view returns (uint256[] memory);

function getOrderExecutionHistory(uint256 orderId) external view returns (Execution[] memory);
```

### 2. Frontend <-> Contract Interface (wagmi/viem)

```typescript
// Write operations (send transactions)
createOrder(poolKey, zeroForOne, amountPerExecution, interval, numExecutions)
cancelOrder(orderId)
withdrawOrder(orderId)

// Read operations (no gas, call view functions)
getOrder(orderId): DCAOrder
getUserOrderIds(address): uint256[]
getExecutableOrderIds(): uint256[]

// Event watching (real-time updates)
watchContractEvent('OrderCreated')
watchContractEvent('OrderExecuted')
watchContractEvent('OrderCancelled')
```

### 3. Events Emitted by DCAHook

```solidity
event OrderCreated(
    uint256 indexed orderId,
    address indexed owner,
    PoolKey poolKey,
    bool zeroForOne,
    uint256 amountPerExecution,
    uint256 interval,
    uint256 numExecutions
);

event OrderExecuted(
    uint256 indexed orderId,
    uint256 amountIn,
    uint256 amountOut,
    uint256 timestamp
);

event OrderCancelled(uint256 indexed orderId, uint256 refundAmount);

event OrderCompleted(uint256 indexed orderId);
```

## Suggested Build Order

Dependencies flow downward -- each step depends on the ones above it.

```
Phase 1: Smart Contract (no dependencies)
  1a. Set up Foundry project with v4-core and v4-periphery deps
  1b. Implement DCAHook.sol with order storage + createOrder + cancelOrder
  1c. Implement executeDueOrders() and afterSwap piggyback
  1d. Write tests against local fork
  1e. Deploy to Base (or Base Sepolia for testing)

Phase 2: Frontend Shell (no contract dependency for UI skeleton)
  2a. Next.js project with dark green DeFi theme
  2b. Sidebar layout: Dashboard / DCA Setup / DCA Management
  2c. Wallet connection (RainbowKit + wagmi, Base chain)
  2d. Static UI components with placeholder data

Phase 3: Frontend <-> Contract Integration (depends on Phase 1 + 2)
  3a. Generate contract ABIs, configure wagmi contract hooks
  3b. DCA Setup page: token pair selector, amount, interval, create tx
  3c. DCA Management page: list user orders, cancel/withdraw
  3d. Dashboard: aggregate stats from contract reads

Phase 4: Keeper Bot (depends on Phase 1)
  4a. Simple Node.js/ts script with viem
  4b. Poll for executable orders, call executeDueOrders()
  4c. Run locally or on a simple cron

Phase 5: Polish (depends on Phase 3)
  5a. Animations and transitions
  5b. Loading states, error handling, tx confirmation UX
  5c. Real token pair data (fetch from Uniswap pool registry)
```

**For the demo session**: Phases 1-3 are essential. Phase 4 can be demoed with manual "Execute Now" buttons. Phase 5 is time-permitting polish.

**Parallel work**: Phases 1 and 2 can proceed simultaneously since the frontend skeleton does not need the deployed contract. Phase 3 bridges them.

## Important Design Considerations

### Hook Address Mining

Uniswap v4 hooks encode their permissions in the hook contract address itself (the last 14 bits). The DCAHook needs `afterSwap` permission at minimum, which means the deployed address must have the correct bit set. This requires:

- Using CREATE2 with a mined salt to get the right address
- The `HookMiner` utility from v4-periphery handles this

### Flash Accounting and Swap Execution

When the hook executes DCA swaps inside `afterSwap`, it must interact with PoolManager's flash accounting system:

1. Call `poolManager.swap()` to execute the DCA order's swap
2. Settle token deltas via `poolManager.take()` and `poolManager.settle()`
3. All of this happens within the same `unlock` callback context

### Gas Limits in afterSwap

Executing multiple DCA orders inside `afterSwap` can hit gas limits. Mitigations:

- Cap the number of orders executed per callback (e.g., max 5)
- Prioritize oldest/most overdue orders
- Rely on the keeper for the rest

### Reentrancy and Security

- The hook will be called by PoolManager, which has its own reentrancy guards
- DCA order execution within `afterSwap` must not create infinite loops (hook executing a swap that triggers another `afterSwap` on the same pool)
- Use a reentrancy guard or execution flag to prevent recursive execution

---

*Research compiled from Uniswap v4 documentation, v4-template repository structure, and established DCA/TWAMM hook architecture patterns.*
