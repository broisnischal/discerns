import {
  SiClaude,
  SiCursor,
  SiGithubcopilot,
  SiGooglegemini,
  SiWindsurf,
} from "@icons-pack/react-simple-icons";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Logo } from "#/components/app-shell.tsx";
import {
  ArrowRightIcon,
  CheckIcon,
  FolderIcon,
  HistoryIcon,
  LockIcon,
  ScrollTextIcon,
  TerminalIcon,
  UsersIcon,
  type Icon,
} from "#/components/icons.ts";
import { ThemeToggle } from "#/components/theme-toggle.tsx";
import { Button } from "#/components/ui/button.tsx";
import { useAuth } from "#/lib/auth/hooks.ts";
import { INTRO_PRICE, LIMITS, PRO_PRICES, YEARLY_SAVINGS_PERCENT } from "#/lib/billing/plan.ts";
import { $getPricing } from "#/lib/items/functions.ts";
import { APP_NAME } from "#/lib/site.ts";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.query(pricingQuery);
  },
  component: HomePage,
});

const pricingQuery = {
  queryKey: ["pricing"],
  queryFn: () => $getPricing(),
  staleTime: 10 * 60 * 1000,
};

const AGENTS = [
  { name: "Claude Code", icon: SiClaude },
  { name: "Cursor", icon: SiCursor },
  { name: "VS Code", icon: SiGithubcopilot },
  { name: "Codex", icon: TerminalIcon },
  { name: "Gemini CLI", icon: SiGooglegemini },
  { name: "Windsurf", icon: SiWindsurf },
];

const FEATURES: { icon: Icon; tint: string; title: string; body: string }[] = [
  {
    icon: FolderIcon,
    tint: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
    title: "One project per repo",
    body: "Agents find the project from the git remote and load its memories before they start.",
  },
  {
    icon: ScrollTextIcon,
    tint: "bg-orange-500/14 text-orange-700 dark:text-orange-300",
    title: "Live logs",
    body: "Agents stream what they run and what broke. Your team watches it land in real time.",
  },
  {
    icon: UsersIcon,
    tint: "bg-teal-500/12 text-teal-700 dark:text-teal-300",
    title: "Share with people, not links",
    body: "Add teammates by email to an item or a whole project. Their agents see it too.",
  },
  {
    icon: LockIcon,
    tint: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
    title: "Env files stay private",
    body: "Secrets are encrypted at rest and only ever shared with named people.",
  },
  {
    icon: HistoryIcon,
    tint: "bg-amber-500/14 text-amber-700 dark:text-amber-300",
    title: "Every edit is kept",
    body: "Each save is a version, from you, a teammate, or an agent. Restore any of them.",
  },
  {
    icon: TerminalIcon,
    tint: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
    title: "Works in every agent",
    body: "Standard MCP with sign-in. Claude, Cursor, Codex, Gemini, and anything else that speaks it.",
  },
];

function HomePage() {
  const { user } = useAuth();
  const pricing = useQuery(pricingQuery);
  const start = user
    ? { to: "/app" as const, label: "Open your items" }
    : { to: "/login" as const, label: "Get started free" };

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Logo withName />
          <nav
            aria-label="Sections"
            className="hidden items-center gap-6 text-sm text-muted-foreground md:flex"
          >
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
            <Link to="/app/connect" className="hover:text-foreground">
              Agents
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button render={<Link to="/app" />} nativeButton={false}>
                Open app
              </Button>
            ) : (
              <Button render={<Link to="/login" />} nativeButton={false}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="flex flex-col">
        {/* Hero */}
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-7 px-5 pt-16 pb-12 text-center sm:px-8 md:pt-24">
          <Link
            to="/app/connect"
            className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <span className="flex -space-x-1" aria-hidden="true">
              {AGENTS.slice(0, 4).map((a) => (
                <span
                  key={a.name}
                  className="grid size-5 place-items-center rounded-full bg-background ring-2 ring-muted"
                >
                  <a.icon className="size-3" />
                </span>
              ))}
            </span>
            Works with Claude Code, Cursor, Codex, and more
            <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </Link>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
            The shared clipboard for your team and your AI agents
          </h1>
          <p className="max-w-2xl text-lg text-pretty text-muted-foreground">
            Save prompts, memories, snippets, and env files once. Your teammates and every coding
            agent you use can find them, update them, and stream live logs back.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button render={<Link to={start.to} />} nativeButton={false} size="lg">
              {start.label}
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Button>
            <Button
              render={<Link to="/app/connect" />}
              nativeButton={false}
              size="lg"
              variant="outline"
            >
              Connect your agent
            </Button>
          </div>
        </section>

        {/* Product preview */}
        <section
          aria-label="How it looks in an agent"
          className="mx-auto w-full max-w-4xl px-5 pb-20 sm:px-8"
        >
          <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
            <div className="overflow-hidden surface text-start">
              <div className="flex items-center gap-1.5 border-b px-4 py-3" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-rose-400/80" />
                <span className="size-2.5 rounded-full bg-amber-400/80" />
                <span className="size-2.5 rounded-full bg-emerald-400/80" />
                <span className="ms-3 text-xs text-muted-foreground">claude · ~/code/api</span>
              </div>
              <div className="flex flex-col gap-3 p-4 font-mono text-[13px] leading-relaxed">
                <p>
                  <span className="text-muted-foreground">›</span> save this review prompt to the
                  project and share it with sam@acme.dev
                </p>
                <p className="text-muted-foreground">
                  ⏺ discerns · save_item{" "}
                  <span className="text-foreground">
                    kind: prompt, project: github.com/acme/api
                  </span>
                </p>
                <p className="text-muted-foreground">
                  ⏺ discerns · share_item{" "}
                  <span className="text-foreground">sam@acme.dev, viewer</span>
                </p>
                <p>
                  <span className="text-emerald-600 dark:text-emerald-400">✓</span> Saved “Code
                  review prompt” and shared it with Sam.
                </p>
                <p className="truncate text-selected-foreground">discerns.app/p/k7k7JhgfEdhS</p>
              </div>
            </div>
            <div className="flex flex-col overflow-hidden surface text-start">
              <div className="flex items-center justify-between border-b px-4 py-3 text-xs">
                <span className="font-medium">Deploy run · api</span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  Live
                </span>
              </div>
              <ol className="flex flex-col gap-1.5 p-4 font-mono text-[12px] leading-relaxed">
                {[
                  "$ vp build",
                  "✓ 412 modules in 2.3s",
                  "$ wrangler deploy",
                  "ERROR binding DB not found",
                  "fixed wrangler.jsonc, retrying",
                  "✓ deployed in 4.1s",
                ].map((line, i) => (
                  <li key={line} className="flex gap-3">
                    <span className="w-4 text-end text-muted-foreground/60 tabular-nums">
                      {i + 1}
                    </span>
                    <span className={line.startsWith("ERROR") ? "text-destructive" : undefined}>
                      {line}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <ul
            aria-label="Supported agents"
            className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground"
          >
            {AGENTS.map((a) => (
              <li key={a.name} className="inline-flex items-center gap-2">
                <a.icon className="size-4" aria-hidden="true" />
                {a.name}
              </li>
            ))}
          </ul>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
            <div className="mb-10 max-w-2xl space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-balance">
                Context that follows the work, not the chat window
              </h2>
              <p className="text-pretty text-muted-foreground">
                Every session starts where the last one stopped, for you, your team, and your
                agents.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex flex-col gap-4 surface p-5">
                  <span
                    aria-hidden="true"
                    className={`grid size-11 place-items-center rounded-xl ${f.tint}`}
                  >
                    <f.icon className="size-5" />
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-medium">{f.title}</h3>
                    <p className="text-sm text-pretty text-muted-foreground">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto w-full max-w-4xl scroll-mt-20 px-5 py-20 sm:px-8">
          <div className="mb-10 space-y-2 text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Simple pricing</h2>
            <p className="text-muted-foreground">Start free. Upgrade when your agents need it.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <PlanCard
              name="Free"
              price="$0"
              per="forever"
              note="The website, for trying things out"
              features={[
                `${LIMITS.free.items} items`,
                `${LIMITS.free.projects} project`,
                "Share by email and keep every version",
                "Encrypted env files",
              ]}
              cta={
                <Button
                  render={<Link to={start.to} />}
                  nativeButton={false}
                  variant="outline"
                  className="w-full"
                >
                  {user ? "Open your items" : "Start free"}
                </Button>
              }
            />
            <PlanCard
              name="Pro"
              highlight
              price={PRO_PRICES.monthly.price}
              per={PRO_PRICES.monthly.per}
              note={
                pricing.data?.intro
                  ? `${INTRO_PRICE} for your first month`
                  : pricing.data?.yearly
                    ? `or ${PRO_PRICES.yearly.price} a year, save ${YEARLY_SAVINGS_PERCENT}%`
                    : "Billed monthly"
              }
              features={[
                "Unlimited items and projects",
                "Every coding agent connected over MCP",
                "Live logs and project context for agents",
                "Cancel anytime",
              ]}
              cta={
                <Button
                  render={
                    <Link
                      to={user ? "/app/settings" : "/login"}
                      search={user ? { tab: "billing" as const } : undefined}
                    />
                  }
                  nativeButton={false}
                  className="w-full"
                >
                  {pricing.data?.intro ? `Start Pro for ${INTRO_PRICE}` : "Upgrade to Pro"}
                </Button>
              }
            />
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:px-8">
          <span>
            © {new Date().getFullYear()} {APP_NAME}
          </span>
          <nav aria-label="Footer" className="flex gap-6">
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
            <Link to="/app/connect" className="hover:text-foreground">
              Connect an agent
            </Link>
            <Link to="/login" className="hover:text-foreground">
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function PlanCard({
  name,
  price,
  per,
  note,
  features,
  cta,
  highlight = false,
}: {
  name: string;
  price: string;
  per: string;
  note: string;
  features: string[];
  cta: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "flex flex-col gap-6 rounded-3xl bg-selected p-6 shadow-[inset_0_0_0_2px_var(--primary)]"
          : "flex flex-col gap-6 surface p-6"
      }
    >
      <div className="space-y-3">
        <h3 className="font-medium">{name}</h3>
        <p className="flex items-baseline gap-1">
          <span className="text-4xl font-semibold tracking-tight tabular-nums">{price}</span>
          <span className="text-sm text-muted-foreground">/ {per}</span>
        </p>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
      <ul className="flex flex-col gap-2.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-auto">{cta}</div>
    </div>
  );
}
