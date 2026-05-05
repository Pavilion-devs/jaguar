import type { Verdict } from "@jaguar/domain";

type StatusPillProps = {
  verdict: Verdict;
  compact?: boolean;
};

const verdictStyles: Record<Verdict, string> = {
  ignore: "border-border bg-muted/40 text-muted-foreground",
  watch: "border-primary/35 bg-primary/10 text-primary",
  enter: "border-emerald-500/35 bg-emerald-500/12 text-emerald-300",
};

export function StatusPill({ verdict, compact = false }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border font-medium capitalize ${
        compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs tracking-[0.12em] uppercase"
      } ${verdictStyles[verdict]}`}
    >
      {verdict}
    </span>
  );
}
