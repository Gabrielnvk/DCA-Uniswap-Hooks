"use client";

import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Clock, Activity, Loader2 } from "lucide-react";
import { useUserOrders } from "@/hooks/use-dca-orders";
import { INTERVAL_LABELS } from "@/lib/contracts";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { orders, isLoading } = useUserOrders(address);

  const activeOrders = orders.filter((o) => o.active);
  const totalDeposited = orders.reduce((sum, o) => sum + o.deposited, 0n);
  const totalReceived = orders.reduce((sum, o) => sum + o.received, 0n);

  // Find soonest next execution
  let nextExecLabel = "--";
  if (activeOrders.length > 0) {
    const now = Math.floor(Date.now() / 1000);
    let soonest = Infinity;
    for (const order of activeOrders) {
      const next = Number(order.lastExecutionTime) + Number(order.interval);
      if (next < soonest) soonest = next;
    }
    const diff = soonest - now;
    if (diff <= 0) {
      nextExecLabel = "Due now";
    } else {
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      nextExecLabel = hours > 24
        ? `${Math.floor(hours / 24)}d ${hours % 24}h`
        : hours > 0
          ? `${hours}h ${minutes}m`
          : `${minutes}m`;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your DCA positions on Base
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposited</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                formatUnits(totalDeposited, 18)
              )}
            </div>
            <p className="text-xs text-muted-foreground">across all positions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : activeOrders.length}
            </div>
            <p className="text-xs text-muted-foreground">currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Execution</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : nextExecLabel}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeOrders.length === 0 ? "no active positions" : "soonest across all"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                formatUnits(totalReceived, 18)
              )}
            </div>
            <p className="text-xs text-muted-foreground">accumulated tokens</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">Connect your wallet</p>
              <p className="text-sm">Connect to see your DCA activity</p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">No activity yet</p>
              <p className="text-sm">Create your first DCA position to get started</p>
              <Badge variant="outline" className="mt-4 border-primary/30 text-primary">
                Base Network
              </Badge>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order.orderId.toString()}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${order.active ? "bg-primary" : "bg-muted-foreground"}`} />
                    <div>
                      <p className="text-sm font-medium font-mono">
                        {order.tokenIn.slice(0, 6)}...→ {order.tokenOut.slice(0, 6)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {INTERVAL_LABELS[Number(order.interval)] ?? "Custom"} · {Number(order.swapsExecuted)}/{Number(order.totalSwaps)} swaps
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={order.active ? "border-primary/30 text-primary" : ""}
                  >
                    {order.active ? "Active" : "Done"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
