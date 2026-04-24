import { cn } from "@/lib/utils";

type PixelAgentProps = {
  color: string;
  size?: "sm" | "md";
};

export function PixelAgent({ color, size = "md" }: PixelAgentProps) {
  const cells = [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [0, 3],
    [3, 3],
    [1, 4],
    [2, 4],
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-4 rounded-md bg-transparent",
        size === "md" && "gap-[2px] p-[2px]",
        size === "sm" && "gap-[1px] p-[1px]",
      )}
    >
      {Array.from({ length: 20 }).map((_, index) => {
        const x = index % 4;
        const y = Math.floor(index / 4);
        const filled = cells.some(([cx, cy]) => cx === x && cy === y);

        return (
          <div
            key={index}
            className={cn(
              "rounded-[2px]",
              size === "md" && "h-2.5 w-2.5",
              size === "sm" && "h-1.5 w-1.5",
            )}
            style={{
              background: filled ? color : "transparent",
              boxShadow: filled ? `0 0 10px ${color}22 inset` : "none",
            }}
          />
        );
      })}
    </div>
  );
}
