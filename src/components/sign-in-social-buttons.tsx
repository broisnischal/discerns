import { SiGithub, SiGoogle } from "@icons-pack/react-simple-icons";
import { useMutation } from "@tanstack/react-query";

import { Button } from "#/components/ui/button.tsx";
import { toast } from "#/components/ui/toast.tsx";
import { authClient } from "#/lib/auth/auth-client.ts";

const PROVIDERS = [
  { id: "google", label: "Google", icon: SiGoogle },
  { id: "github", label: "GitHub", icon: SiGithub },
] as const;

function SignInSocialButton({
  provider,
  callbackURL,
}: {
  provider: (typeof PROVIDERS)[number];
  callbackURL: string;
}) {
  const mutation = useMutation({
    mutationFn: async () =>
      await authClient.signIn.social(
        { provider: provider.id, callbackURL },
        {
          onError: ({ error }) => {
            toast.add({
              type: "error",
              description: error.message || `Couldn't sign in with ${provider.label}. Try again.`,
            });
          },
        },
      ),
  });

  return (
    <Button
      variant="outline"
      className="w-full"
      size="lg"
      type="button"
      disabled={mutation.isSuccess || mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      <provider.icon className="size-4" aria-hidden="true" />
      Continue with {provider.label}
    </Button>
  );
}

export function SocialSignInButtons({ callbackURL }: { callbackURL: string }) {
  return (
    <div className="grid gap-3">
      {PROVIDERS.map((provider) => (
        <SignInSocialButton key={provider.id} provider={provider} callbackURL={callbackURL} />
      ))}
    </div>
  );
}
