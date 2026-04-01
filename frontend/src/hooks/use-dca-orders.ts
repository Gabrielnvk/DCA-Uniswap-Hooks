"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { dcaHookConfig } from "@/lib/contracts";

export interface DCAOrder {
  orderId: bigint;
  owner: string;
  tokenIn: string;
  tokenOut: string;
  zeroForOne: boolean;
  amountPerSwap: bigint;
  interval: bigint;
  totalSwaps: bigint;
  swapsExecuted: bigint;
  lastExecutionTime: bigint;
  deposited: bigint;
  received: bigint;
  active: boolean;
}

export function useUserOrderIds(address: string | undefined) {
  const result = useReadContract({
    ...dcaHookConfig,
    functionName: "getUserOrderIds",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });
  return { ...result, data: result.data as bigint[] | undefined };
}

export function useOrder(orderId: bigint | undefined) {
  return useReadContract({
    ...dcaHookConfig,
    functionName: "getOrder",
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: orderId !== undefined },
  });
}

export function useUserOrders(address: string | undefined) {
  const { data: orderIds, isLoading: idsLoading } = useUserOrderIds(address);

  const contracts = (orderIds ?? []).map((id) => ({
    address: dcaHookConfig.address,
    abi: dcaHookConfig.abi as any,
    functionName: "getOrder" as const,
    args: [id] as const,
  }));

  const { data: orderResults, isLoading: ordersLoading } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 },
  });

  const orders: DCAOrder[] = [];
  if (orderIds && orderResults) {
    for (let i = 0; i < orderIds.length; i++) {
      const result = orderResults[i];
      if (result?.status === "success" && result.result) {
        const r = result.result as any;
        orders.push({
          orderId: (orderIds as bigint[])[i],
          owner: r.owner ?? r[0],
          tokenIn: r.tokenIn ?? r[1],
          tokenOut: r.tokenOut ?? r[2],
          zeroForOne: r.zeroForOne ?? r[4],
          amountPerSwap: r.amountPerSwap ?? r[5],
          interval: r.interval ?? r[6],
          totalSwaps: r.totalSwaps ?? r[7],
          swapsExecuted: r.swapsExecuted ?? r[8],
          lastExecutionTime: r.lastExecutionTime ?? r[9],
          deposited: r.deposited ?? r[10],
          received: r.received ?? r[11],
          active: r.active ?? r[12],
        });
      }
    }
  }

  return {
    orders,
    isLoading: idsLoading || ordersLoading,
    orderIds: orderIds as bigint[] | undefined,
  };
}
