"use client";

import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Clock, Activity, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUserOrders } from "@/hooks/use-dca-orders";
import { INTERVAL_LABELS } from "@/lib/contracts";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { orders, isLoading } = useUserOrders(address);

  const activeOrders = orders.filter((o) => o.active);
  const totalDeposited = orders.reduce((sum, o) => sum + o.deposited, 0n);
  const totalReceived = orders.reduce((sum, o) => sum + o.received, 0n);

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

  const stats = [
    {
      title: "Total Deposited",
      value: isLoading ? null : formatUnits(totalDeposited, 18),
      subtitle: "across all positions",
      icon: DollarSign,
    },
    {
      title: "Active Positions",
      value: isLoading ? null : activeOrders.length.toString(),
      subtitle: "currently running",
      icon: Activity,
    },
    {
      title: "Next Execution",
      value: isLoading ? null : nextExecLabel,
      subtitle: activeOrders.length === 0 ? "no active positions" : "soonest across all",
      icon: Clock,
    },
    {
      title: "Total Received",
      value: isLoading ? null : formatUnits(totalReceived, 18),
      subtitle: "accumulated tokens",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your DCA positions on Base
          </p>
        </div>
        <Link href="/setup">
          <Button className="btn-glow">
            New Position <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-primary/60" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {stat.value === null ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  stat.value
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="card-hover">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Positions</CardTitle>
          {orders.length > 0 && (
            <Link href="/management">
              <Button variant="ghost" size="sm" className="text-primary">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                <Activity className="h-8 w-8 text-primary/20" />
              </div>
              <p className="text-lg font-medium">Connect your wallet</p>
              <p className="text-sm mt-1">Connect to see your DCA activity</p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                <Activity className="h-8 w-8 text-primary/20" />
              </div>
              <p className="text-lg font-medium">No activity yet</p>
              <p className="text-sm mt-1">Create your first DCA position to get started</p>
              <Link href="/setup">
                <Button variant="outline" className="mt-4 border-primary/30 text-primary hover:bg-primary/5">
                  Create Position
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order.orderId.toString()}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${order.active ? "bg-primary pulse-green" : "bg-muted-foreground/50"}`} />
                    <div>
                      <p className="text-sm font-medium font-mono">
                        {order.tokenIn.slice(0, 6)}... → {order.tokenOut.slice(0, 6)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {INTERVAL_LABELS[Number(order.interval)] ?? "Custom"} · {Number(order.swapsExecuted)}/{Number(order.totalSwaps)} swaps
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={order.active ? "border-primary/30 text-primary" : "border-muted-foreground/30"}
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
