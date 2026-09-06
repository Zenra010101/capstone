export function DifferenceDisplay({ value }: { value: number }) {
  if (value === 0) return <span className="text-muted-foreground">0</span>;
  const positive = value > 0;
  return (
    <span className={`font-semibold tabular-nums ${positive ? "text-amount-positive" : "text-amount-negative"}`}>
      {positive ? "+" : ""}
      {value}
    </span>
  );
}
