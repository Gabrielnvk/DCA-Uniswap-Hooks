"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ListChecks, ExternalLink } from "lucide-react";

export default function ManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">DCA Management</h2>
        <p className="text-muted-foreground">
          Monitor and manage your active DCA positions
        </p>
      </div>

      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <ListChecks className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No positions yet</p>
            <p className="text-sm">Create a DCA position from the setup page</p>
          </div>
        </CardContent>
      </Card>

      {/* Example position card (hidden, for design reference) */}
      <div className="hidden">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">USDC → ETH</CardTitle>
              <p className="text-sm text-muted-foreground">Daily · 10 swaps</p>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/30">Active</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span>3 / 10 swaps</span>
              </div>
              <Progress value={30} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Spent</p>
                <p className="font-medium">300 USDC</p>
              </div>
              <div>
                <p className="text-muted-foreground">Received</p>
                <p className="font-medium">0.15 ETH</p>
              </div>
              <div>
                <p className="text-muted-foreground">Next execution</p>
                <p className="font-medium">in 4h 23m</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg. price</p>
                <p className="font-medium">$2,000.00</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" className="flex-1">
                Withdraw
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
