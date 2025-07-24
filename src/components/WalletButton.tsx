import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { truncateAddress } from "@/lib/utils";
import { Wallet, LogOut } from "lucide-react";

export const WalletButton = () => {
  const { wallet, publicKey, disconnect } = useWallet();

  if (publicKey) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {truncateAddress(publicKey.toString())}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnect}
          className="border-destructive/20 text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <WalletMultiButton className="!bg-gradient-primary !text-primary-foreground !border-0 !rounded-lg !px-6 !py-2 !font-medium !transition-all !duration-200 hover:!shadow-primary hover:!scale-105" />
  );
};