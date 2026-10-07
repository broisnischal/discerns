import { Link, type LinkProps } from "@tanstack/react-router";

import { ChevronLeftIcon, type Icon } from "#/components/icons.ts";

/**
 * Title row for inner pages: a back link on top, then icon, title, subtitle, and actions
 * on one line. Keeps every page's top edge identical.
 */
export function PageHeader({
  back,
  icon: PageIcon,
  title,
  subtitle,
  actions,
}: {
  back?: { to: LinkProps["to"]; label: string; search?: LinkProps["search"] };
  icon?: Icon;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3">
      {back && (
        <Link
          to={back.to}
          search={back.search}
          className="inline-flex w-fit items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
        >
          <ChevronLeftIcon className="size-4" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {PageIcon && (
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-selected text-selected-foreground"
          >
            <PageIcon className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1 basis-48">
          <h1 className="truncate text-lg leading-tight font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
