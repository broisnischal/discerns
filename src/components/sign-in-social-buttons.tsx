import { SiGithub, SiGoogle } from "@icons-pack/react-simple-icons";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { LoaderCircleIcon } from "#/components/icons.ts";
import { toast } from "#/components/ui/toast.tsx";
import { authClient } from "#/lib/auth/auth-client.ts";
import { cn } from "#/lib/utils.ts";

const PROVIDERS = [
  { id: "google", label: "Google", icon: SiGoogle, color: "default" },
  { id: "github", label: "GitHub", icon: SiGithub, color: "currentColor" },
] as const;
type ProviderId = (typeof PROVIDERS)[number]["id"];

const LAST_USED_KEY = "discerns:last-sign-in";

function readLastUsed(): ProviderId | null {
  try {
    const value = localStorage.getItem(LAST_USED_KEY);
    return PROVIDERS.some((p) => p.id === value) ? (value as ProviderId) : null;
  } catch {
    return null;
  }
}

export function SocialSignInButtons({ callbackURL }: { callbackURL: string }) {
  // Read after mount so the server and first client render agree.
  const [lastUsed, setLastUsed] = useState<ProviderId | null>(null);
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setLastUsed(readLastUsed());
  }, []);

  const signIn = useMutation({
    mutationFn: async (provider: (typeof PROVIDERS)[number]) => {
      try {
        localStorage.setItem(LAST_USED_KEY, provider.id);
      } catch {
        // Private windows can refuse storage; the hint is only a convenience.
      }
      const result = await authClient.signIn.social({ provider: provider.id, callbackURL });
      if (result.error) {
        throw new Error(
          result.error.message || `Couldn't sign in with ${provider.label}. Try again.`,
        );
      }
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });

  return (
    <div className="flex w-full flex-col gap-3">
      {PROVIDERS.map((provider) => {
        const pending = signIn.isPending && signIn.variables?.id === provider.id;
        return (
          <button
            key={provider.id}
            type="button"
            disabled={signIn.isPending}
            onClick={() => signIn.mutate(provider)}
            className={cn(
              "relative flex h-12 w-full items-center gap-3 rounded-2xl bg-card px-4 text-[15px] font-medium shadow-(--shadow-border) transition-[box-shadow,scale] duration-150 hover:shadow-(--shadow-border-hover) focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none active:scale-[0.99] disabled:cursor-default disabled:opacity-70",
            )}
          >
            {pending ? (
              <LoaderCircleIcon
                className="size-5 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            ) : (
              <provider.icon className="size-5" color={provider.color} aria-hidden="true" />
            )}
            Continue with {provider.label}
            {lastUsed === provider.id && (
              <span className="ms-auto rounded-full bg-selected px-2 py-0.5 text-xs font-medium text-selected-foreground">
                Last used
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
