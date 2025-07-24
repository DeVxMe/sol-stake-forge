import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatSol, formatTimestamp } from "@/lib/utils";
import { Coins, TrendingUp, Clock, Zap } from "lucide-react";
import { StakeAccount } from "@/lib/anchor";
import BN from "bn.js";

interface StakeCardProps {
  stakeAccount: StakeAccount | null;
  balance: number;
  onStake: (amount: number) => Promise<void>;
  onUnstake: (amount: number) => Promise<void>;
  onClaim: () => Promise<void>;
  loading: boolean;
}

export const StakeCard = ({ 
  stakeAccount, 
  balance, 
  onStake, 
  onUnstake, 
  onClaim, 
  loading 
}: StakeCardProps) => {
  const { publicKey } = useWallet();
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");

  if (!publicKey) {
    return (
      <Card className="bg-gradient-secondary border-border/50 shadow-accent">
        <CardContent className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">Connect your wallet to start staking</p>
        </CardContent>
      </Card>
    );
  }

  const stakedSol = stakeAccount ? formatSol(stakeAccount.stakedAmount) : "0";
  const totalPoints = stakeAccount ? stakeAccount.totalPoints.toString() : "0";
  const lastUpdated = stakeAccount ? formatTimestamp(stakeAccount.lastUpdatedTime) : "Never";

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-secondary border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Staked Amount</p>
                <p className="text-xl font-bold text-primary">{stakedSol} SOL</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-secondary border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Points</p>
                <p className="text-xl font-bold text-accent">{totalPoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-secondary border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/20 rounded-lg">
                <Clock className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
                <p className="text-xl font-bold text-success">{formatSol(balance)} SOL</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Staking Interface */}
      <Card className="bg-gradient-secondary border-border/50 shadow-accent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Solana Staking
          </CardTitle>
          <CardDescription>
            Stake SOL to earn points. Last updated: {lastUpdated}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="stake" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="stake">Stake</TabsTrigger>
              <TabsTrigger value="unstake">Unstake</TabsTrigger>
              <TabsTrigger value="claim">Claim</TabsTrigger>
            </TabsList>

            <TabsContent value="stake" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stake-amount">Amount to Stake (SOL)</Label>
                <Input
                  id="stake-amount"
                  type="number"
                  placeholder="0.0"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="bg-input border-border"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStakeAmount((balance * 0.25).toString())}
                    className="text-xs"
                  >
                    25%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStakeAmount((balance * 0.5).toString())}
                    className="text-xs"
                  >
                    50%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStakeAmount((balance * 0.75).toString())}
                    className="text-xs"
                  >
                    75%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStakeAmount((balance * 0.9).toString())}
                    className="text-xs"
                  >
                    MAX
                  </Button>
                </div>
              </div>
              <Button
                onClick={() => onStake(parseFloat(stakeAmount))}
                disabled={!stakeAmount || parseFloat(stakeAmount) <= 0 || loading}
                className="w-full bg-gradient-primary hover:shadow-primary"
              >
                {loading ? "Staking..." : "Stake SOL"}
              </Button>
            </TabsContent>

            <TabsContent value="unstake" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unstake-amount">Amount to Unstake (SOL)</Label>
                <Input
                  id="unstake-amount"
                  type="number"
                  placeholder="0.0"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  className="bg-input border-border"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUnstakeAmount((parseFloat(stakedSol) * 0.25).toString())}
                    className="text-xs"
                  >
                    25%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUnstakeAmount((parseFloat(stakedSol) * 0.5).toString())}
                    className="text-xs"
                  >
                    50%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUnstakeAmount((parseFloat(stakedSol) * 0.75).toString())}
                    className="text-xs"
                  >
                    75%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUnstakeAmount(stakedSol)}
                    className="text-xs"
                  >
                    ALL
                  </Button>
                </div>
              </div>
              <Button
                onClick={() => onUnstake(parseFloat(unstakeAmount))}
                disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0 || loading}
                variant="destructive"
                className="w-full"
              >
                {loading ? "Unstaking..." : "Unstake SOL"}
              </Button>
            </TabsContent>

            <TabsContent value="claim" className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Available Points</span>
                  <Badge variant="secondary" className="bg-accent/20 text-accent">
                    {totalPoints} points
                  </Badge>
                </div>
              </div>
              <Button
                onClick={onClaim}
                disabled={loading || parseInt(totalPoints) === 0}
                className="w-full bg-gradient-accent hover:shadow-accent"
              >
                {loading ? "Claiming..." : "Claim Points"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};