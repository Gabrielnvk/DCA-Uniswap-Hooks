# DCA Uniswap v4 Hooks -- Stack Research

> Last updated: 2026-03-28
> Context: Demo product for a 30-min live coding session. Desktop-first, Base chain, dark-mode DeFi aesthetic. Speed of scaffolding matters more than long-term scalability.

---

## Frontend Stack

### Framework: Next.js 15 (App Router)

- **Version**: `next@^15.1` (latest stable as of early 2026)
- **Why**: App Router is now the default and stable path. Server Components reduce client bundle, but for this project nearly everything is client-side (wallet state, contract reads). Use `"use client"` liberally.
- **Why not Next 14**: Missing recent React 19 integration improvements and Turbopack stability gains that ship with 15.
- **Key config**: `next.config.ts` (TypeScript config is default in 15). Enable `turbopack` for dev speed (`next dev --turbopack`).

### React 19

- Ships with Next.js 15. No separate install needed.
- Gives us `use()` hook, improved Suspense, and Actions -- though we likely won't use most of these for a demo.

### TypeScript ~5.6

- Non-negotiable for any wagmi/viem project; both libraries are TypeScript-first and rely on type inference for contract ABIs.

### Wallet Connection: RainbowKit 2 + wagmi 2 + viem 2

| Library | Version | Role |
|---------|---------|------|
| `@rainbow-me/rainbowkit` | `^2.2` | Drop-in wallet modal, chain switching, account display |
| `wagmi` | `^2.14` | React hooks for contract reads/writes, wallet state |
| `viem` | `^2.23` | Low-level EVM client (transport, ABI encoding, etc.) |
| `@tanstack/react-query` | `^5.62` | Required peer dep of wagmi 2; handles caching/refetching |

**Why RainbowKit over ConnectKit**:
- RainbowKit has better out-of-the-box dark theme that matches DeFi aesthetic with minimal customization.
- Built-in chain switching UI (important -- user must be on Base).
- `darkTheme()` from `@rainbow-me/rainbowkit` gives you a polished dark modal instantly.
- ConnectKit is viable but requires more manual styling for equivalent polish, and its ecosystem momentum has slowed relative to RainbowKit in 2025-2026.
- Both use wagmi 2 underneath; RainbowKit just saves more demo time.

**RainbowKit setup essentials**:
```ts
// app/providers.tsx
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';

const config = getDefaultConfig({
  appName: 'DCA Uniswap Hooks',
  projectId: '<walletconnect-project-id>', // get from cloud.walletconnect.com
  chains: [base],
});
```

### UI Components: shadcn/ui

- **Not a library** -- it copies component source into your repo (`npx shadcn@latest init`, then `npx shadcn@latest add button card dialog ...`).
- **Why**: Zero runtime overhead, full control over styling, Tailwind-native, looks professional out of the box.
- **Components to pull in**: `button`, `card`, `input`, `select`, `dialog`, `tabs`, `badge`, `separator`, `sidebar`, `tooltip`, `progress`.
- **Theme**: Customize `globals.css` CSS variables for the dark green DeFi palette (override `--primary`, `--accent`, etc.).

### Styling: Tailwind CSS 4

- **Version**: `tailwindcss@^4.0` (v4 released Jan 2025, stable throughout 2025-2026)
- **Why v4 over v3**: CSS-first configuration (no `tailwind.config.js` needed for most cases), automatic content detection, significantly faster builds. shadcn/ui has full v4 support.
- **Key change from v3**: Config lives in CSS (`@theme` directive) rather than JS. Colors, spacing, etc. are defined directly in your CSS file.
- If shadcn init generates a v3-style config, that still works -- v4 has backward compat. But prefer the CSS-native approach.

### State Management: None (wagmi + React Query is enough)

- wagmi 2 uses TanStack React Query internally. Contract reads auto-cache and refetch.
- For local UI state (selected tokens, form inputs), plain React `useState` is sufficient.
- **Do not add**: Redux, Zustand, Jotai, or any external state library. It is unnecessary complexity for a 3-page demo app.

### Animations: Framer Motion 11

- **Version**: `framer-motion@^11.15` (rebranded package name is still `framer-motion`, not `motion`)
- **Why**: Page transitions, card entrance animations, progress bars. Makes the demo feel polished.
- **Keep it simple**: `<motion.div initial/animate/exit>` wrappers, nothing more.
- Alternative: CSS transitions + Tailwind `transition-*` classes for simpler cases. Use Framer only where CSS falls short (layout animations, exit animations).

### Token Lists and Metadata

- Use the Uniswap token list or CoinGecko token list for token logos/metadata.
- `@uniswap/token-lists` for type definitions.
- For a demo, hardcode 5-10 popular Base tokens (WETH, USDC, USDbC, cbETH, DAI) rather than loading the full list dynamically.

---

## Smart Contract Stack

### Foundry (forge, cast, anvil)

- **Install**: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- **Why Foundry over Hardhat**: Faster compilation, Solidity-native tests, better for hooks development. The Uniswap v4 template is Foundry-first.
- Solidity version: `^0.8.26` (required by v4-core for transient storage opcodes)

### Uniswap v4 Dependencies

| Dependency | Source | Install |
|-----------|--------|---------|
| `v4-core` | `github.com/Uniswap/v4-core` | `forge install Uniswap/v4-core` |
| `v4-periphery` | `github.com/Uniswap/v4-periphery` | `forge install Uniswap/v4-periphery` |

- **v4-core** provides: `IPoolManager`, `PoolKey`, `IHooks`, `BaseHook`, `Currency`, `BalanceDelta`.
- **v4-periphery** provides: `PositionManager`, swap routers, and hook deployment utilities.
- Pin to specific commits or tags rather than `main` for reproducibility. Check the latest release tag on each repo.

**remappings.txt**:
```
@uniswap/v4-core/=lib/v4-core/
@uniswap/v4-periphery/=lib/v4-periphery/
forge-std/=lib/forge-std/src/
```

### DCA Hook Contract Architecture

The hook should implement:
- `afterSwap` or `afterInitialize` -- attach DCA schedule metadata to a pool
- A keeper/executor pattern: anyone can call `executeDCA(positionId)` if the interval has elapsed
- Storage: mapping of user positions (token pair, amount, interval, last execution timestamp, remaining executions)
- The hook calls back into PoolManager to perform the swap on behalf of the user

**Key Solidity patterns**:
```solidity
// Inherit from BaseHook
contract DCAHook is BaseHook {
    struct DCAPosition {
        address owner;
        PoolKey poolKey;
        uint256 amountPerSwap;
        uint256 interval;       // seconds between swaps
        uint256 lastExecution;
        uint256 remainingSwaps;
        bool zeroForOne;        // swap direction
    }

    mapping(uint256 => DCAPosition) public positions;
}
```

**Hook permissions**: The hook needs `afterSwap` and possibly `beforeSwap` flags. Use `getHookPermissions()` to declare only what you need.

### OpenZeppelin (if needed)

- `forge install OpenZeppelin/openzeppelin-contracts`
- Only if you need `IERC20`, `SafeERC20`, or `Ownable`. v4-core already handles most token interactions internally.

### Base Chain Deployment Details

- **Chain ID**: 8453
- **RPC**: `https://mainnet.base.org` (public) or use Alchemy/Infura for reliability
- **Block explorer**: `https://basescan.org`
- **Uniswap v4 PoolManager on Base**: Deployed at a canonical address (verify on Uniswap docs or basescan before deploying)
- **Gas**: ~$0.0003 per simple tx -- ideal for demo

---

## Development Tooling

### Project Scaffolding (fast path)

```bash
# Frontend
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir
cd frontend
npx shadcn@latest init   # choose "new-york" style, dark mode
npm install @rainbow-me/rainbowkit wagmi viem@^2 @tanstack/react-query
npm install framer-motion

# Contracts
cd ..
mkdir contracts && cd contracts
forge init --template https://github.com/uniswap/v4-template
```

The `v4-template` gives you a working Foundry project with v4-core and v4-periphery already wired, plus a Counter hook example to modify.

### Monorepo Structure

```
DCA-Uniswap-Hooks/
  frontend/          # Next.js app
    src/
      app/           # App Router pages
      components/    # UI components
      hooks/         # Custom React hooks (useCreateDCA, useDCAPositions, etc.)
      lib/           # wagmi config, constants, ABIs
  contracts/         # Foundry project
    src/             # Solidity sources
    test/            # Forge tests
    script/          # Deployment scripts
    foundry.toml
```

### Deployment Scripts

```solidity
// script/DeployDCAHook.s.sol
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {DCAHook} from "../src/DCAHook.sol";
import {HookMiner} from "../test/utils/HookMiner.sol"; // mine correct address prefix

contract DeployDCAHook is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        // Hook address must have correct flag bits -- use CREATE2 + HookMiner
        // ... deployment logic
        vm.stopBroadcast();
    }
}
```

**Deploy command**:
```bash
forge script script/DeployDCAHook.s.sol \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

### Dev Workflow

1. **Contracts first**: Write hook, test with `forge test -vvv`, deploy to Base.
2. **Export ABI**: Copy ABI JSON from `contracts/out/DCAHook.sol/DCAHook.json` into `frontend/src/lib/abis/`.
3. **Frontend**: Wire up wagmi hooks (`useReadContract`, `useWriteContract`) against deployed address.
4. **Local testing**: Use `anvil --fork-url https://mainnet.base.org` for fork testing before mainnet deploy.

### Environment Variables

```env
# frontend/.env.local
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<from cloud.walletconnect.com>
NEXT_PUBLIC_DCA_HOOK_ADDRESS=0x...
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org

# contracts/.env
PRIVATE_KEY=0x...
BASESCAN_API_KEY=...
BASE_RPC_URL=https://mainnet.base.org
```

### Key Dev Commands

| Task | Command |
|------|---------|
| Dev server | `cd frontend && npm run dev` (with Turbopack) |
| Compile contracts | `cd contracts && forge build` |
| Run contract tests | `cd contracts && forge test -vvv` |
| Deploy to Base | `cd contracts && forge script script/DeployDCAHook.s.sol --rpc-url $BASE_RPC_URL --broadcast` |
| Fork Base locally | `anvil --fork-url https://mainnet.base.org --port 8545` |
| Verify contract | `forge verify-contract <address> DCAHook --chain base` |

---

## What NOT to Use

### Hardhat -- Do Not Use
- Slower compilation than Foundry. JavaScript-based testing is clunkier for Solidity-heavy projects.
- Uniswap v4 template and examples are Foundry-first. Fighting against the ecosystem costs demo time.

### ethers.js -- Do Not Use
- wagmi 2 is built on viem, not ethers. Mixing the two creates type conflicts and bundle bloat.
- viem is faster, more type-safe, and tree-shakeable. ethers v6 is fine in isolation but wrong for this stack.

### ConnectKit -- Skip for This Project
- Viable library, but requires more custom CSS to match a dark DeFi theme. RainbowKit's `darkTheme()` gets you there in one line.
- Smaller ecosystem of pre-built components (no built-in chain switcher UI).

### Zustand / Redux / Jotai -- Do Not Add
- wagmi + React Query already manages all server/contract state. Local UI state is trivial (3 pages, a few forms).
- Adding a state management library is over-engineering for a demo.

### Chakra UI / Material UI / Ant Design -- Do Not Use
- Heavy runtime CSS-in-JS or large bundle sizes. Conflicts with Tailwind approach.
- shadcn/ui is lighter, more flexible, and the standard pairing with Tailwind in 2025-2026 Next.js projects.

### Foundry's Solidity Scripting for Frontend Interaction -- Do Not Use
- Use `cast` for one-off CLI interactions, but the frontend should talk to contracts via wagmi/viem only.
- Do not try to bridge Foundry scripts into the frontend workflow.

### The Graph / Subgraphs -- Overkill for Demo
- For a 3-page demo, read contract state directly via `useReadContract`. No need for indexing infrastructure.
- If you need historical data, use viem's `getLogs` with event filters.

### Alchemy SDK / Moralis / Third-party Abstraction SDKs -- Avoid
- Direct viem RPC calls are simpler and more transparent. These SDKs add indirection without value for this scope.
- Exception: Use Alchemy or Infura as an RPC provider (just the URL), but do not import their SDKs.

### Multicall Libraries -- Not Needed Separately
- viem has built-in multicall support (`client.multicall()`). wagmi's `useReadContracts` (plural) batches automatically.
- Do not install `@multicall/...` or `ethereum-multicall` packages.

### IPFS / Arweave / Decentralized Storage -- Out of Scope
- No metadata or files to store. The app is a standard Next.js deployment (Vercel).

### Proxy Patterns (UUPS, Transparent) -- Do Not Use
- This is a demo hook, not upgradeable infrastructure. Deploy directly. Proxies add complexity and gas.

---

## Summary: The Minimum Viable Install

```bash
# Frontend (6 dependencies beyond Next.js defaults)
npm install @rainbow-me/rainbowkit wagmi viem @tanstack/react-query framer-motion
npx shadcn@latest init
npx shadcn@latest add button card input select dialog tabs badge separator sidebar tooltip progress

# Contracts (Foundry + Uniswap template)
forge init --template https://github.com/uniswap/v4-template
# Template includes: v4-core, v4-periphery, forge-std
```

That is the entire dependency surface. Six npm packages plus shadcn components for the frontend, and the Uniswap v4 Foundry template for contracts. Anything more is scope creep for a demo.
