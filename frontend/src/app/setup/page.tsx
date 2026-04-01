"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits, formatUnits } from "viem";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowDown, Wallet, Loader2, ExternalLink, Check, Repeat } from "lucide-react";
import { useCreateDCA, useApproveToken } from "@/hooks/use-dca-write";
import { DCA_HOOK_ADDRESS, INTERVALS, txUrl } from "@/lib/contracts";

const intervals = [
  { label: "Hourly", value: INTERVALS.HOURLY, description: "Every hour" },
  { label: "Daily", value: INTERVALS.DAILY, description: "Every 24 hours" },
  { label: "Weekly", value: INTERVALS.WEEKLY, description: "Every 7 days" },
];

// Common Base tokens
const TOKENS = [
  { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
  { symbol: "WETH", address: "0x4200000000000000000000000000000000000006", decimals: 18 },
  { symbol: "DAI", address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", decimals: 18 },
  { symbol: "USDbC", address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", decimals: 6 },
];

export default function SetupPage() {
  const { address, isConnected } = useAccount();
  const [tokenIn, setTokenIn] = useState<typeof TOKENS[0] | null>(null);
  const [tokenOut, setTokenOut] = useState<typeof TOKENS[0] | null>(null);
  const [amount, setAmount] = useState("");
  const [selectedInterval, setSelectedInterval] = useState<number>(INTERVALS.DAILY);
  const [numSwaps, setNumSwaps] = useState("10");
  const [showTokenSelect, setShowTokenSelect] = useState<"in" | "out" | null>(null);

  const { approve, isPending: isApproving, isConfirming: isApproveConfirming, isSuccess: isApproved, hash: approveHash } = useApproveToken();
  const { createDCA, isPending: isCreating, isConfirming: isCreateConfirming, isSuccess: isCreated, hash: createHash } = useCreateDCA();

  const totalDeposit = amount && numSwaps
    ? Number(amount) * Number(numSwaps)
    : 0;

  const durationLabel = selectedInterval === INTERVALS.HOURLY
    ? `${Number(numSwaps)} hours`
    : selectedInterval === INTERVALS.DAILY
      ? `${Number(numSwaps)} days`
      : `${Number(numSwaps)} weeks`;

  function handleApprove() {
    if (!tokenIn) return;
    const totalAmount = parseUnits(totalDeposit.toString(), tokenIn.decimals);
    approve(
      tokenIn.address as `0x${string}`,
      DCA_HOOK_ADDRESS,
      totalAmount
    );
  }

  function handleSelectToken(token: typeof TOKENS[0]) {
    if (showTokenSelect === "in") setTokenIn(token);
    else setTokenOut(token);
    setShowTokenSelect(null);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">DCA Setup</h2>
        <p className="text-muted-foreground">
          Configure a new Dollar-Cost Averaging position
        </p>
      </div>

      {/* Connect Wallet Gate */}
      {!isConnected && (
        <Card className="border-primary/20">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                <Repeat className="h-8 w-8 text-primary/30" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Connect your wallet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                Connect your wallet to start setting up automated DCA positions on Base
              </p>
              <ConnectButton />
            </div>
          </CardContent>
        </Card>
      )}

      {isConnected && (<>
      {/* Token Select Modal */}
      {showTokenSelect && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Select {showTokenSelect === "in" ? "sell" : "buy"} token</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {TOKENS.filter(t => showTokenSelect === "in" ? t !== tokenOut : t !== tokenIn).map((token) => (
              <Button
                key={token.address}
                variant="outline"
                className="justify-start"
                onClick={() => handleSelectToken(token)}
              >
                <span className="font-mono">{token.symbol}</span>
                <span className="text-xs text-muted-foreground ml-auto">{token.decimals}d</span>
              </Button>
            ))}
            <Button variant="ghost" onClick={() => setShowTokenSelect(null)}>Cancel</Button>
          </CardContent>
        </Card>
      )}

      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Token Pair</CardTitle>
          <CardDescription>Select the tokens to swap</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">You sell</label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="w-32 justify-start"
                onClick={() => setShowTokenSelect("in")}
              >
                {tokenIn ? (
                  <span className="font-mono">{tokenIn.symbol}</span>
                ) : (
                  <><Wallet className="h-4 w-4 mr-2" />Select</>
                )}
              </Button>
              <Input
                type="number"
                placeholder="Amount per swap"
                className="flex-1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-center">
            <div className="rounded-full border border-border p-2">
              <ArrowDown className="h-4 w-4 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">You buy</label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="w-32 justify-start"
                onClick={() => setShowTokenSelect("out")}
              >
                {tokenOut ? (
                  <span className="font-mono">{tokenOut.symbol}</span>
                ) : (
                  <><Wallet className="h-4 w-4 mr-2" />Select</>
                )}
              </Button>
              <Input type="number" placeholder="0.0" disabled className="flex-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>How often and how many times to execute</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Interval</label>
            <div className="grid grid-cols-3 gap-2">
              {intervals.map((interval) => (
                <Button
                  key={interval.value}
                  variant={selectedInterval === interval.value ? "default" : "outline"}
                  className="flex flex-col h-auto py-3"
                  onClick={() => setSelectedInterval(interval.value)}
                >
                  <span className="font-medium">{interval.label}</span>
                  <span className="text-xs opacity-70">{interval.description}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Number of swaps</label>
            <Input
              type="number"
              placeholder="10"
              min={1}
              value={numSwaps}
              onChange={(e) => setNumSwaps(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="card-hover border-primary/10">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Token pair</span>
            <span>{tokenIn && tokenOut ? `${tokenIn.symbol} → ${tokenOut.symbol}` : "--"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount per swap</span>
            <span>{amount ? `${amount} ${tokenIn?.symbol ?? ""}` : "--"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total deposit</span>
            <span className="font-medium">{totalDeposit > 0 ? `${totalDeposit} ${tokenIn?.symbol ?? ""}` : "--"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duration</span>
            <span>{numSwaps ? durationLabel : "--"}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Network</span>
            <Badge variant="outline" className="border-primary/30 text-primary">Base</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Links */}
      {approveHash && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-primary" />
          <span>Approval tx:</span>
          <a href={txUrl(approveHash)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
            {approveHash.slice(0, 10)}...
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
      {createHash && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-primary" />
          <span>Create tx:</span>
          <a href={txUrl(createHash)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
            {createHash.slice(0, 10)}...
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      <div className="flex gap-3">
        {!isConnected ? (
          <Button className="flex-1 h-12 text-base" size="lg" disabled>
            Connect Wallet First
          </Button>
        ) : (
          <>
            <Button
              className="flex-1 h-12 text-base transition-all duration-200"
              variant={isApproved ? "outline" : "default"}
              size="lg"
              onClick={handleApprove}
              disabled={!tokenIn || !amount || !numSwaps || isApproving || isApproveConfirming || isApproved}
            >
              {isApproving || isApproveConfirming ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Approving...</>
              ) : isApproved ? (
                <><Check className="h-4 w-4 mr-2" />Approved</>
              ) : (
                <>1. Approve Token</>
              )}
            </Button>
            <Button
              className={`flex-1 h-12 text-base transition-all duration-200 ${isApproved && !isCreated ? "btn-glow" : ""}`}
              size="lg"
              disabled={!isApproved || isCreating || isCreateConfirming}
              onClick={() => {
                if (!tokenIn || !tokenOut) return;
                // Note: In production, you'd look up the actual pool key
                // For demo, construct a basic pool key
                createDCA({
                  poolKey: {
                    currency0: (tokenIn.address < tokenOut.address ? tokenIn.address : tokenOut.address) as `0x${string}`,
                    currency1: (tokenIn.address < tokenOut.address ? tokenOut.address : tokenIn.address) as `0x${string}`,
                    fee: 3000,
                    tickSpacing: 60,
                    hooks: DCA_HOOK_ADDRESS,
                  },
                  zeroForOne: tokenIn.address < tokenOut.address,
                  amountPerSwap: parseUnits(amount, tokenIn.decimals),
                  interval: BigInt(selectedInterval),
                  totalSwaps: BigInt(numSwaps),
                });
              }}
            >
              {isCreating || isCreateConfirming ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
              ) : isCreated ? (
                <><Check className="h-4 w-4 mr-2" />Created!</>
              ) : (
                <>2. Create DCA</>
              )}
            </Button>
          </>
        )}
      </div>
      </>)}
    </div>
  );
}
