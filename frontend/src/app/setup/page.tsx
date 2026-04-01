"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowDown, Wallet } from "lucide-react";

const intervals = [
  { label: "Hourly", value: 3600, description: "Every hour" },
  { label: "Daily", value: 86400, description: "Every 24 hours" },
  { label: "Weekly", value: 604800, description: "Every 7 days" },
];

export default function SetupPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">DCA Setup</h2>
        <p className="text-muted-foreground">
          Configure a new Dollar-Cost Averaging position
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Token Pair</CardTitle>
          <CardDescription>Select the tokens to swap</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">You sell</label>
            <div className="flex gap-2">
              <Button variant="outline" className="w-32 justify-start">
                <Wallet className="h-4 w-4 mr-2" />
                Select
              </Button>
              <Input type="number" placeholder="0.0" className="flex-1" />
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
              <Button variant="outline" className="w-32 justify-start">
                <Wallet className="h-4 w-4 mr-2" />
                Select
              </Button>
              <Input type="number" placeholder="0.0" disabled className="flex-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
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
                  variant="outline"
                  className="flex flex-col h-auto py-3"
                >
                  <span className="font-medium">{interval.label}</span>
                  <span className="text-xs text-muted-foreground">{interval.description}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Number of swaps</label>
            <Input type="number" placeholder="10" min={1} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount per swap</span>
            <span>--</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total deposit</span>
            <span>--</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duration</span>
            <span>--</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Network</span>
            <Badge variant="outline" className="border-primary/30 text-primary">Base</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button className="flex-1" size="lg">
          Approve Token
        </Button>
        <Button className="flex-1" size="lg" disabled>
          Create DCA
        </Button>
      </div>
    </div>
  );
}
