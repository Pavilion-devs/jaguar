import { DatabaseZap } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border bg-background/60 px-6 py-16 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card">
        <DatabaseZap className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <p className="text-base font-medium">{title}</p>
        <p className="max-w-md text-sm leading-7 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
