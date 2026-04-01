// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "uniswap-hooks/base/BaseHook.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "v4-core/src/types/PoolOperation.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {CurrencySettler} from "uniswap-hooks/utils/CurrencySettler.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract DCAHook is BaseHook {
    using SafeERC20 for IERC20;
    using CurrencySettler for Currency;

    struct DCAOrder {
        address owner;
        Currency tokenIn;
        Currency tokenOut;
        PoolKey poolKey;
        bool zeroForOne;
        uint256 amountPerSwap;
        uint256 interval;
        uint256 totalSwaps;
        uint256 swapsExecuted;
        uint256 lastExecutionTime;
        uint256 deposited;
        uint256 received;
        bool active;
    }

    mapping(uint256 => DCAOrder) public orders;
    mapping(address => uint256[]) public userOrderIds;
    mapping(bytes32 => uint256[]) public poolOrderIds;
    uint256 public nextOrderId;
    bool private _executing;

    event OrderCreated(
        uint256 indexed orderId,
        address indexed owner,
        Currency tokenIn,
        Currency tokenOut,
        uint256 amountPerSwap,
        uint256 interval,
        uint256 totalSwaps,
        uint256 deposited
    );

    event OrderExecuted(
        uint256 indexed orderId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );

    event OrderWithdrawn(
        uint256 indexed orderId,
        uint256 refundedTokenIn,
        uint256 withdrawnTokenOut
    );

    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: false,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    // ─── Order Creation ──────────────────────────────────────────────

    function createDCA(
        PoolKey calldata key,
        bool zeroForOne,
        uint256 amountPerSwap,
        uint256 interval,
        uint256 totalSwaps
    ) external returns (uint256 orderId) {
        require(amountPerSwap > 0, "DCAHook: zero amount");
        require(totalSwaps > 0, "DCAHook: zero swaps");
        require(
            interval == 3600 || interval == 86400 || interval == 604800,
            "DCAHook: invalid interval"
        );

        Currency tokenIn = zeroForOne ? key.currency0 : key.currency1;
        Currency tokenOut = zeroForOne ? key.currency1 : key.currency0;
        uint256 totalDeposit = amountPerSwap * totalSwaps;

        IERC20(Currency.unwrap(tokenIn)).safeTransferFrom(
            msg.sender,
            address(this),
            totalDeposit
        );

        orderId = nextOrderId++;

        orders[orderId] = DCAOrder({
            owner: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            poolKey: key,
            zeroForOne: zeroForOne,
            amountPerSwap: amountPerSwap,
            interval: interval,
            totalSwaps: totalSwaps,
            swapsExecuted: 0,
            lastExecutionTime: block.timestamp,
            deposited: totalDeposit,
            received: 0,
            active: true
        });

        userOrderIds[msg.sender].push(orderId);
        poolOrderIds[keccak256(abi.encode(key))].push(orderId);

        emit OrderCreated(
            orderId,
            msg.sender,
            tokenIn,
            tokenOut,
            amountPerSwap,
            interval,
            totalSwaps,
            totalDeposit
        );
    }

    // ─── afterSwap: DCA Execution Engine ─────────────────────────────

    function _afterSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) internal override returns (bytes4, int128) {
        if (_executing) {
            return (this.afterSwap.selector, 0);
        }

        _executing = true;

        bytes32 poolId = keccak256(abi.encode(key));
        uint256[] storage orderIds = poolOrderIds[poolId];
        uint256 executed = 0;
        uint256 maxPerCallback = 5;

        for (uint256 i = 0; i < orderIds.length && executed < maxPerCallback; i++) {
            DCAOrder storage order = orders[orderIds[i]];

            if (!order.active) continue;
            if (order.swapsExecuted >= order.totalSwaps) continue;
            if (block.timestamp < order.lastExecutionTime + order.interval) continue;

            _executeDCAOrder(orderIds[i], order);
            executed++;
        }

        _executing = false;

        return (this.afterSwap.selector, 0);
    }

    function _executeDCAOrder(uint256 orderId, DCAOrder storage order) internal {
        order.swapsExecuted += 1;
        order.lastExecutionTime = block.timestamp;

        if (order.swapsExecuted >= order.totalSwaps) {
            order.active = false;
        }

        // Approve PoolManager to take tokenIn
        IERC20(Currency.unwrap(order.tokenIn)).forceApprove(
            address(poolManager),
            order.amountPerSwap
        );

        // Execute swap via PoolManager (we're already in an unlocked context from the parent swap)
        BalanceDelta delta = poolManager.swap(
            order.poolKey,
            SwapParams({
                zeroForOne: order.zeroForOne,
                amountSpecified: -int256(order.amountPerSwap),
                sqrtPriceLimitX96: order.zeroForOne
                    ? TickMath.MIN_SQRT_PRICE + 1
                    : TickMath.MAX_SQRT_PRICE - 1
            }),
            ""
        );

        // Settle deltas: pay tokenIn, receive tokenOut
        uint256 amountIn = order.amountPerSwap;
        int128 amount0Delta = delta.amount0();
        int128 amount1Delta = delta.amount1();

        uint256 amountOut;
        if (order.zeroForOne) {
            amountOut = uint256(uint128(amount1Delta > 0 ? amount1Delta : -amount1Delta));
        } else {
            amountOut = uint256(uint128(amount0Delta > 0 ? amount0Delta : -amount0Delta));
        }

        // Use CurrencySettler to handle settle/take
        order.tokenIn.settle(poolManager, address(this), amountIn, false);
        order.tokenOut.take(poolManager, address(this), amountOut, false);

        order.received += amountOut;

        emit OrderExecuted(orderId, amountIn, amountOut, block.timestamp);
    }

    // ─── Withdrawal ──────────────────────────────────────────────────

    function withdrawDCA(uint256 orderId) external {
        DCAOrder storage order = orders[orderId];
        require(order.owner == msg.sender, "DCAHook: not owner");
        require(order.active, "DCAHook: order not active");

        order.active = false;

        uint256 swapsRemaining = order.totalSwaps - order.swapsExecuted;
        uint256 refundAmount = swapsRemaining * order.amountPerSwap;
        uint256 receivedAmount = order.received;
        order.received = 0;

        if (refundAmount > 0) {
            IERC20(Currency.unwrap(order.tokenIn)).safeTransfer(order.owner, refundAmount);
        }
        if (receivedAmount > 0) {
            IERC20(Currency.unwrap(order.tokenOut)).safeTransfer(order.owner, receivedAmount);
        }

        emit OrderWithdrawn(orderId, refundAmount, receivedAmount);
    }

    function claimTokenOut(uint256 orderId) external {
        DCAOrder storage order = orders[orderId];
        require(order.owner == msg.sender, "DCAHook: not owner");
        require(order.received > 0, "DCAHook: nothing to claim");

        uint256 receivedAmount = order.received;
        order.received = 0;

        IERC20(Currency.unwrap(order.tokenOut)).safeTransfer(order.owner, receivedAmount);

        emit OrderWithdrawn(orderId, 0, receivedAmount);
    }

    // ─── View Functions ──────────────────────────────────────────────

    function getOrder(uint256 orderId) external view returns (DCAOrder memory) {
        return orders[orderId];
    }

    function getUserOrderIds(address user) external view returns (uint256[] memory) {
        return userOrderIds[user];
    }

    function getPoolOrderIds(bytes32 poolId) external view returns (uint256[] memory) {
        return poolOrderIds[poolId];
    }
}
