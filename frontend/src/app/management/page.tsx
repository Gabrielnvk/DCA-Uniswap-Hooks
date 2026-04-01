"use client";

import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ListChecks, ExternalLink, Loader2, Clock } from "lucide-react";
import { useUserOrders, type DCAOrder } from "@/hooks/use-dca-orders";
import { useWithdrawDCA, useClaimTokenOut } from "@/hooks/use-dca-write";
import { INTERVAL_LABELS, txUrl } from "@/lib/contracts";

function formatTimeUntilNext(order: DCAOrder) {
  const nextExec = Number(order.lastExecutionTime) + Number(order.interval);
  const now = Math.floor(Date.now() / 1000);
  const diff = nextExec - now;

  if (diff <= 0) return "Due now";
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (hours > 24) return `in ${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
}

function OrderCard({ order }: { order: DCAOrder }) {
  const { withdrawDCA, isPending: isWithdrawing, isConfirming: isWithdrawConfirming, hash: withdrawHash } = useWithdrawDCA();
  const { claimTokenOut, isPending: isClaiming, isConfirming: isClaimConfirming, hash: claimHash } = useClaimTokenOut();

  const progress = Number(order.swapsExecuted) / Number(order.totalSwaps) * 100;
  const isComplete = order.swapsExecuted >= order.totalSwaps;
  const hasClaimable = order.received > 0n;

  // Shorten addresses for display
  const tokenInLabel = order.tokenIn.slice(0, 6) + "..." + order.tokenIn.slice(-4);
  const tokenOutLabel = order.tokenOut.slice(0, 6) + "..." + order.tokenOut.slice(-4);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-mono">
            {tokenInLabel} → {tokenOutLabel}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {INTERVAL_LABELS[Number(order.interval)] ?? "Custom"} · {Number(order.totalSwaps)} swaps
          </p>
        </div>
        <Badge
          className={
            order.active
              ? "bg-primary/10 text-primary border-primary/30"
              : isComplete
                ? "bg-muted text-muted-foreground"
                : "bg-destructive/10 text-destructive border-destructive/30"
          }
        >
          {order.active ? "Active" : isComplete ? "Completed" : "Cancelled"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span>{Number(order.swapsExecuted)} / {Number(order.totalSwaps)} swaps</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Deposited</p>
            <p className="font-medium font-mono">{formatUnits(order.deposited, 18)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Received</p>
            <p className="font-medium font-mono">{formatUnits(order.received, 18)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Per swap</p>
            <p className="font-medium font-mono">{formatUnits(order.amountPerSwap, 18)}</p>
          </div>
          {order.active && (
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Next execution
              </p>
              <p className="font-medium">{formatTimeUntilNext(order)}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {order.active && (
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              disabled={isWithdrawing || isWithdrawConfirming}
              onClick={() => withdrawDCA(order.orderId)}
            >
              {isWithdrawing || isWithdrawConfirming ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Withdrawing...</>
              ) : (
                "Withdraw"
              )}
            </Button>
          )}
          {!order.active && hasClaimable && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              disabled={isClaiming || isClaimConfirming}
              onClick={() => claimTokenOut(order.orderId)}
            >
              {isClaiming || isClaimConfirming ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Claiming...</>
              ) : (
                "Claim Tokens"
              )}
            </Button>
          )}
          {(withdrawHash || claimHash) && (
            <a href={txUrl((withdrawHash || claimHash)!)} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ManagementPage() {
  const { address, isConnected } = useAccount();
  const { orders, isLoading } = useUserOrders(address);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">DCA Management</h2>
        <p className="text-muted-foreground">
          Monitor and manage your active DCA positions
        </p>
      </div>

      {!isConnected ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <ListChecks className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">Connect your wallet</p>
              <p className="text-sm">Connect to view your DCA positions</p>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Loading positions...</p>
            </div>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <ListChecks className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">No positions yet</p>
              <p className="text-sm">Create a DCA position from the setup page</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orders.map((order) => (
            <OrderCard key={order.orderId.toString()} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
