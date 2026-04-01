"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { dcaHookConfig } from "@/lib/contracts";

export function useCreateDCA() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function createDCA(args: {
    poolKey: {
      currency0: `0x${string}`;
      currency1: `0x${string}`;
      fee: number;
      tickSpacing: number;
      hooks: `0x${string}`;
    };
    zeroForOne: boolean;
    amountPerSwap: bigint;
    interval: bigint;
    totalSwaps: bigint;
  }) {
    writeContract({
      ...dcaHookConfig,
      functionName: "createDCA",
      args: [
        args.poolKey,
        args.zeroForOne,
        args.amountPerSwap,
        args.interval,
        args.totalSwaps,
      ],
    });
  }

  return { createDCA, hash, isPending, isConfirming, isSuccess, error };
}

export function useWithdrawDCA() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function withdrawDCA(orderId: bigint) {
    writeContract({
      ...dcaHookConfig,
      functionName: "withdrawDCA",
      args: [orderId],
    });
  }

  return { withdrawDCA, hash, isPending, isConfirming, isSuccess, error };
}

export function useClaimTokenOut() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function claimTokenOut(orderId: bigint) {
    writeContract({
      ...dcaHookConfig,
      functionName: "claimTokenOut",
      args: [orderId],
    });
  }

  return { claimTokenOut, hash, isPending, isConfirming, isSuccess, error };
}

export function useApproveToken() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function approve(tokenAddress: `0x${string}`, spender: `0x${string}`, amount: bigint) {
    writeContract({
      address: tokenAddress,
      abi: [
        {
          name: "approve",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ name: "", type: "bool" }],
        },
      ],
      functionName: "approve",
      args: [spender, amount],
    });
  }

  return { approve, hash, isPending, isConfirming, isSuccess, error };
}
