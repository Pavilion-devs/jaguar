type MetricCardProps = {
  title: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export function MetricCard({ title, value, detail, icon: Icon }: MetricCardProps) {
  return (
    <article className="rounded-3xl border border-border/80 bg-card/95 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background/70">
          <Icon className="h-5 w-5 text-primary" aria-hidden />
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">{detail}</p>
    </article>
  );
}
