import { Link } from "@tanstack/react-router";

import { Logo } from "#/components/app-shell.tsx";
import { ThemeToggle } from "#/components/theme-toggle.tsx";
import { Button } from "#/components/ui/button.tsx";
import { useAuth } from "#/lib/auth/hooks.ts";
import { APP_NAME } from "#/lib/site.ts";
import { cn } from "#/lib/utils.ts";

/** Header and footer for public pages: the landing page and the legal pages. */
export function SiteLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

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
            <a href="/#features" className="hover:text-foreground">
              Features
            </a>
            <a href="/#pricing" className="hover:text-foreground">
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

      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:px-8">
          <span>
            © {new Date().getFullYear()} {APP_NAME}
          </span>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            <a href="/#pricing" className="hover:text-foreground">
              Pricing
            </a>
            <Link to="/app/connect" className="hover:text-foreground">
              Connect an agent
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/license" className="hover:text-foreground">
              License
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** A readable single-column document with a title and last-updated line. */
export function LegalPage({
  title,
  updated,
  wide = false,
  children,
}: {
  title: string;
  updated?: string;
  /** Room for 80-column preformatted text such as the license. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <SiteLayout>
      <article
        className={cn(
          "mx-auto w-full px-5 py-14 sm:px-8 md:py-20",
          wide ? "max-w-3xl" : "max-w-2xl",
        )}
      >
        <header className="space-y-2 border-b pb-8">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {updated && <p className="text-sm text-muted-foreground">Last updated {updated}</p>}
        </header>
        <div className="text-[15px] leading-7 text-pretty text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:decoration-from-font [&_a]:underline-offset-4 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_li]:mt-1.5 [&_p]:mt-4 [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:ps-5">
          {children}
        </div>
      </article>
    </SiteLayout>
  );
}
