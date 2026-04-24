import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PanelCardProps = React.ComponentProps<typeof Card>;

export function PanelCard({ className, ...props }: PanelCardProps) {
  return (
    <Card
      className={cn(
        "rounded-[28px] border-white/8 bg-[linear-gradient(180deg,rgba(19,19,19,0.95),rgba(10,10,10,0.92))] shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}
