import { WalletButton } from "@/components/WalletButton";
import { StakeCard } from "@/components/StakeCard";
import { useStaking } from "@/hooks/useStaking";
import { Button } from "@/components/ui/button";
import { RefreshCw, Zap } from "lucide-react";

const Index = () => {
  const { 
    loading, 
    balance, 
    stakeAccount, 
    stake, 
    unstake, 
    claimPoints, 
    refresh 
  } = useStaking();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-lg shadow-primary">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Sol Stake Forge
                </h1>
                <p className="text-sm text-muted-foreground">
                  Stake SOL • Earn Points • Power the Future
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={loading}
                className="border-border/50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <WalletButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Stake with Confidence
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Participate in Solana's proof-of-stake consensus and earn rewards. 
              Secure the network while growing your SOL holdings.
            </p>
          </div>

          {/* Staking Interface */}
          <StakeCard
            stakeAccount={stakeAccount}
            balance={balance}
            onStake={stake}
            onUnstake={unstake}
            onClaim={claimPoints}
            loading={loading}
          />

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <div className="p-6 bg-gradient-secondary border border-border/50 rounded-lg">
              <h3 className="text-xl font-semibold mb-3 text-primary">How It Works</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Connect your Solana wallet</li>
                <li>• Stake your SOL to start earning</li>
                <li>• Earn points based on staking duration</li>
                <li>• Claim rewards anytime</li>
              </ul>
            </div>
            
            <div className="p-6 bg-gradient-secondary border border-border/50 rounded-lg">
              <h3 className="text-xl font-semibold mb-3 text-accent">Features</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Secure smart contract on Solana</li>
                <li>• Instant staking and unstaking</li>
                <li>• Real-time point calculation</li>
                <li>• No minimum staking period</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>Built on Solana • Powered by Anchor</p>
            <p className="text-sm mt-2">Program ID: 6wjCHbb4fJivBCesGtUmPEdHRVKaQFa5v1KDZCXC9TGo</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
