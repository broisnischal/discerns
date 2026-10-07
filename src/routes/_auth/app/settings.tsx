import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { CopyButton } from "#/components/copy-button.tsx";
import {
  ArrowRightIcon,
  CheckIcon,
  CreditCardIcon,
  LoaderCircleIcon,
  MonitorIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
} from "#/components/icons.ts";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs.tsx";
import { toast } from "#/components/ui/toast.tsx";
import { authClient } from "#/lib/auth/auth-client.ts";
import { useAuthSuspense } from "#/lib/auth/hooks.ts";
import { authQueryOptions } from "#/lib/auth/queries.ts";
import { PRO_PRICES, YEARLY_SAVINGS_PERCENT, type BillingInterval } from "#/lib/billing/plan.ts";
import { initials, timeAgo } from "#/lib/format.ts";
import { billingQueryOptions } from "#/lib/items/queries.ts";
import { cn } from "#/lib/utils.ts";

export const Route = createFileRoute("/_auth/app/settings")({
  validateSearch: z.object({
    tab: z.enum(["profile", "security", "billing"]).optional().catch(undefined),
    billing: z.enum(["success"]).optional().catch(undefined),
  }),
  head: () => ({ meta: [{ title: "Settings" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const search = Route.useSearch();
  // Coming back from checkout lands on the billing tab with a confirmation.
  const initialTab = search.billing === "success" ? "billing" : (search.tab ?? "profile");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Settings</h1>
      <Tabs defaultValue={initialTab}>
        <TabsList variant="line" className="border-b pb-1">
          <TabsTrigger value="profile" className="gap-2 px-2 text-[15px]">
            <UserIcon aria-hidden="true" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 px-2 text-[15px]">
            <ShieldCheckIcon aria-hidden="true" />
            Security
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2 px-2 text-[15px]">
            <CreditCardIcon aria-hidden="true" />
            Billing
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="pt-2">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="security" className="pt-2">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="billing" className="pt-2">
          <BillingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab() {
  const { user } = useAuthSuspense();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const result = await authClient.updateUser({ name: name.trim() });
      if (result.error) throw new Error(result.error.message ?? "Unable to save your name");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryOptions().queryKey });
      toast.add({ type: "success", description: "Name saved." });
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });

  if (!user) return null;
  const dirty = name.trim() !== user.name && name.trim().length > 0;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty && !save.isPending) save.mutate();
      }}
    >
      <div className="divide-y">
        <div className="settings-row">
          <span className="text-muted-foreground">User ID</span>
          <span className="flex items-center gap-1 sm:justify-end">
            <code className="font-mono text-sm text-selected-foreground">{user.id}</code>
            <CopyButton value={user.id} size="icon-sm" variant="ghost" label="Copy user ID" />
          </span>
        </div>
        <div className="settings-row">
          <Label htmlFor="name" className="text-muted-foreground">
            Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoComplete="name"
            required
            className="w-full sm:ms-auto sm:w-72"
          />
        </div>
        <div className="settings-row">
          <span className="text-muted-foreground">Email address</span>
          <span className="flex items-center gap-2 sm:justify-end">
            <span className="truncate">{user.email}</span>
            {user.emailVerified && (
              <CheckIcon className="size-4 text-emerald-500" aria-label="Verified" />
            )}
          </span>
        </div>
        <div className="settings-row">
          <span className="text-muted-foreground">Profile picture</span>
          <span className="flex items-center gap-3 sm:justify-end">
            <span className="text-sm text-muted-foreground">From your sign-in provider</span>
            <Avatar className="rounded-lg after:rounded-lg">
              {user.image && <AvatarImage src={user.image} alt="" className="rounded-lg" />}
              <AvatarFallback className="rounded-lg">{initials(user.name)}</AvatarFallback>
            </Avatar>
          </span>
        </div>
      </div>
      <div>
        <Button type="submit" disabled={!dirty || save.isPending}>
          {save.isPending && <LoaderCircleIcon className="animate-spin" aria-hidden="true" />}
          Save
        </Button>
      </div>
    </form>
  );
}

const PROVIDERS = [
  { id: "github", label: "GitHub" },
  { id: "google", label: "Google" },
] as const;

/** Enough of a user agent to tell devices apart in a short list. */
function describeAgent(ua: string | null | undefined) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "Browser";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

function SecurityTab() {
  const queryClient = useQueryClient();
  const sessions = useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: async () => {
      const [list, current] = await Promise.all([
        authClient.listSessions(),
        authClient.getSession(),
      ]);
      if (list.error) throw new Error(list.error.message ?? "Unable to load sessions");
      return { list: list.data, currentToken: current.data?.session.token };
    },
  });
  const accounts = useQuery({
    queryKey: ["auth", "accounts"],
    queryFn: async () => {
      const result = await authClient.listAccounts();
      if (result.error) throw new Error(result.error.message ?? "Unable to load accounts");
      return result.data;
    },
  });

  const refreshSessions = () => queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
  const onError = (error: Error) => toast.add({ type: "error", description: error.message });

  const revoke = useMutation({
    mutationFn: async (token: string) => {
      const result = await authClient.revokeSession({ token });
      if (result.error) throw new Error(result.error.message ?? "Unable to sign out that device");
    },
    onSuccess: refreshSessions,
    onError,
  });
  const revokeOthers = useMutation({
    mutationFn: async () => {
      const result = await authClient.revokeOtherSessions();
      if (result.error) throw new Error(result.error.message ?? "Unable to sign out other devices");
    },
    onSuccess: async () => {
      await refreshSessions();
      toast.add({ type: "success", description: "Signed out everywhere else." });
    },
    onError,
  });
  const link = useMutation({
    mutationFn: async (provider: (typeof PROVIDERS)[number]["id"]) => {
      const result = await authClient.linkSocial({ provider, callbackURL: "/app/settings" });
      if (result.error) throw new Error(result.error.message ?? "Unable to connect that account");
    },
    onError,
  });

  const others = sessions.data?.list.filter((s) => s.token !== sessions.data.currentToken) ?? [];

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3" aria-labelledby="sessions-heading">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 id="sessions-heading" className="font-medium">
              Devices
            </h2>
            <p className="text-sm text-muted-foreground">Where this account is signed in.</p>
          </div>
          {others.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={revokeOthers.isPending}
              onClick={() => revokeOthers.mutate()}
            >
              Sign out other devices
            </Button>
          )}
        </div>
        {sessions.isPending ? (
          <div className="h-24 animate-pulse surface" aria-busy="true" />
        ) : sessions.isError ? (
          <p className="surface p-5 text-sm text-destructive">{sessions.error.message}</p>
        ) : (
          <ul className="divide-y surface">
            {sessions.data.list.map((session) => {
              const current = session.token === sessions.data.currentToken;
              return (
                <li key={session.id} className="flex items-center gap-4 px-4 py-3 sm:px-5">
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
                  >
                    <MonitorIcon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {describeAgent(session.userAgent)}
                      {current && (
                        <span className="ms-2 rounded-md bg-selected px-1.5 py-0.5 text-xs font-medium text-selected-foreground">
                          This device
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground tabular-nums">
                      {session.ipAddress || "Unknown location"} · active{" "}
                      {timeAgo(session.updatedAt)}
                    </span>
                  </span>
                  {!current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={revoke.isPending}
                      onClick={() => revoke.mutate(session.token)}
                    >
                      Sign out
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="accounts-heading">
        <div className="space-y-0.5">
          <h2 id="accounts-heading" className="font-medium">
            Sign-in methods
          </h2>
          <p className="text-sm text-muted-foreground">
            Accounts with the same email land in this one account.
          </p>
        </div>
        {accounts.isPending ? (
          <div className="h-24 animate-pulse surface" aria-busy="true" />
        ) : accounts.isError ? (
          <p className="surface p-5 text-sm text-destructive">{accounts.error.message}</p>
        ) : (
          <ul className="divide-y surface">
            {PROVIDERS.map((provider) => {
              const linked = accounts.data.find((a) => a.providerId === provider.id);
              return (
                <li key={provider.id} className="flex items-center gap-4 px-4 py-3 sm:px-5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{provider.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {linked ? `Connected ${timeAgo(linked.createdAt)}` : "Not connected"}
                    </span>
                  </span>
                  {linked ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckIcon className="size-4 text-emerald-500" aria-hidden="true" />
                      Connected
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={link.isPending}
                      onClick={() => link.mutate(provider.id)}
                    >
                      Connect
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Usage({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const ratio = limit === null ? 0 : Math.min(1, used / limit);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {used}
          {limit !== null && ` / ${limit}`}
        </span>
      </div>
      {limit !== null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div
            className={cn("h-full rounded-full", ratio >= 1 ? "bg-destructive" : "bg-primary")}
            style={{ width: `${Math.max(2, ratio * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function BillingTab() {
  const search = Route.useSearch();
  const billing = useQuery({
    ...billingQueryOptions(),
    // After checkout the webhook may land a few seconds later; keep asking until Pro shows.
    refetchInterval: (query) =>
      search.billing === "success" && query.state.data?.plan !== "pro" ? 2500 : false,
  });

  const [interval, setInterval] = useState<BillingInterval>("yearly");
  const checkout = useMutation({
    mutationFn: async (chosen: BillingInterval) => {
      const result = await authClient.dodopayments.checkoutSession({
        slug: PRO_PRICES[chosen].slug,
      });
      if (result.error) throw new Error(result.error.message ?? "Unable to start checkout");
      if (!result.data?.url) throw new Error("Unable to start checkout");
      window.location.href = result.data.url;
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });
  const portal = useMutation({
    mutationFn: async () => {
      const result = await authClient.dodopayments.customer.portal();
      if (result.error) throw new Error(result.error.message ?? "Unable to open billing");
      if (!result.data?.url) throw new Error("Unable to open billing");
      window.location.href = result.data.url;
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });

  if (billing.isPending) return <div className="h-40 animate-pulse surface" aria-busy="true" />;
  if (billing.isError) {
    return <p className="surface p-5 text-sm text-destructive">{billing.error.message}</p>;
  }
  const { plan, subscription, enabled, intervals, introOffer, limits, usage } = billing.data;
  const isPro = plan === "pro";
  // Yearly is the default pick, but only once its product exists in Dodo.
  const chosen = intervals.includes(interval) ? interval : (intervals[0] ?? "monthly");
  const price = PRO_PRICES[chosen];

  return (
    <div className="flex flex-col gap-6">
      {search.billing === "success" && !isPro && (
        <p className="flex items-center gap-2 surface p-4 text-sm" role="status">
          <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
          Thanks! Your payment is confirmed and Pro will switch on here in a moment.
        </p>
      )}

      <section className="flex flex-col gap-5 surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              {isPro && (
                <SparklesIcon className="size-5 text-selected-foreground" aria-hidden="true" />
              )}
              {isPro ? "Pro" : "Free"} plan
              {isPro && subscription?.interval && (
                <span className="rounded-md bg-selected px-1.5 py-0.5 text-xs font-medium text-selected-foreground">
                  Billed {subscription.interval}
                </span>
              )}
            </h2>
            <p className="text-sm text-pretty text-muted-foreground">
              {isPro
                ? subscription?.cancelAtPeriodEnd && subscription.currentPeriodEnd
                  ? `Cancelled. Pro stays on until ${subscription.currentPeriodEnd.toLocaleDateString()}.`
                  : subscription?.currentPeriodEnd
                    ? `Renews ${subscription.currentPeriodEnd.toLocaleDateString()}.`
                    : "Your coding agents can use discerns over MCP."
                : "Free includes the website with a small library. Pro removes the limits and connects your coding agents."}
            </p>
          </div>
          {isPro && enabled && (
            <Button variant="outline" disabled={portal.isPending} onClick={() => portal.mutate()}>
              Manage billing
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Button>
          )}
          {!enabled && (
            <span className="text-xs text-muted-foreground">
              Billing is not set up on this server.
            </span>
          )}
        </div>
        {!isPro && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Usage label="Items" used={usage.items} limit={limits.items} />
            <Usage label="Projects" used={usage.projects} limit={limits.projects} />
          </div>
        )}
      </section>

      {!isPro && enabled && (
        <section className="flex flex-col gap-4" aria-labelledby="upgrade-heading">
          <h2 id="upgrade-heading" className="font-medium">
            Upgrade to Pro
          </h2>
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Billing interval</legend>
            {intervals.map((option) => {
              const offer = PRO_PRICES[option];
              const selected = option === chosen;
              return (
                <label
                  key={option}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-3 rounded-3xl p-5 transition-[box-shadow,background-color] duration-150 has-focus-visible:ring-3 has-focus-visible:ring-ring/30",
                    selected
                      ? "bg-selected shadow-[inset_0_0_0_2px_var(--primary)]"
                      : "bg-card shadow-(--shadow-border) hover:shadow-(--shadow-border-hover)",
                  )}
                >
                  <input
                    type="radio"
                    name="interval"
                    value={option}
                    checked={selected}
                    onChange={() => setInterval(option)}
                    className="sr-only"
                  />
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {option === "monthly" ? "Monthly" : "Yearly"}
                    </span>
                    {option === "yearly" ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        Save {YEARLY_SAVINGS_PERCENT}%
                      </span>
                    ) : (
                      introOffer && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                          {introOffer} first month
                        </span>
                      )
                    )}
                  </span>
                  <span className="flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight tabular-nums">
                      {offer.price}
                    </span>
                    <span className="text-sm text-muted-foreground">/ {offer.per}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {option === "yearly"
                      ? `$${(offer.amount / 12).toFixed(2)} a month, billed once a year`
                      : introOffer
                        ? `${introOffer} today, then ${offer.price} every month`
                        : "Billed every month"}
                  </span>
                </label>
              );
            })}
          </fieldset>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button size="lg" disabled={checkout.isPending} onClick={() => checkout.mutate(chosen)}>
              {checkout.isPending && (
                <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
              )}
              {chosen === "monthly" && introOffer
                ? `Start Pro for ${introOffer}`
                : `Upgrade to Pro · ${price.price} / ${price.per}`}
            </Button>
            <span className="text-xs text-muted-foreground">
              Secure checkout by Dodo Payments. Cancel anytime.
            </span>
          </div>
        </section>
      )}

      {!isPro && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">What Pro adds</h2>
          <ul className="divide-y surface text-sm">
            {[
              "Unlimited items and projects",
              "Claude Code, Cursor, VS Code, Codex, Gemini CLI, and any MCP agent connected",
              "The discerns plugin: /context, /save, /log, and /handoff",
              "Live logs your agents write while they work, for your team to watch",
              "Project context loaded at the start of every agent session",
            ].map((line) => (
              <li key={line} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <CheckIcon className="size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
