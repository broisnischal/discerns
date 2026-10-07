import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "#/components/site-chrome.tsx";

// The repository's LICENSE.md is the source of truth; the page renders it as written.
import license from "../../LICENSE.md?raw";

export const Route = createFileRoute("/license")({
  head: () => ({ meta: [{ title: "License · discerns" }] }),
  component: LicensePage,
});

function LicensePage() {
  return (
    <LegalPage title="License" wide>
      <p>
        The discerns source code is source-available under the discerns License. You can read,
        change, and run it yourself; publishing a service built from it has conditions.
      </p>
      <pre className="mt-8 overflow-x-auto surface p-5 font-mono text-[12.5px] leading-6 whitespace-pre text-foreground">
        {license}
      </pre>
    </LegalPage>
  );
}
