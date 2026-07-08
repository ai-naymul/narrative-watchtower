import * as React from "react";

/** Consistent page title block used at the top of every route. */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <div className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight text-fg">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
