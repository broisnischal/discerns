import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalPage } from "#/components/site-chrome.tsx";
import { INTRO_PRICE, LIMITS, PRO_PRICES } from "#/lib/billing/plan.ts";
import { APP_NAME, CONTACT_EMAIL, LEGAL_UPDATED } from "#/lib/site.ts";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: `Terms of Service · ${APP_NAME}` }] }),
  component: TermsPage,
});

function TermsPage() {
  const { monthly, yearly } = PRO_PRICES;
  return (
    <LegalPage title="Terms of Service" updated={LEGAL_UPDATED}>
      <p>
        These terms cover your use of {APP_NAME} at discerns.app, including the website, the MCP
        server that coding agents connect to, and the {APP_NAME} plugin. By creating an account or
        using the service, you agree to them. If you use {APP_NAME} for a company, you agree on its
        behalf.
      </p>

      <h2>Your account</h2>
      <p>
        You sign in with GitHub or Google. Keep that account secure, because anyone who controls it
        controls your {APP_NAME} account. You are responsible for activity under your account,
        including actions taken by coding agents you connect.
      </p>

      <h2>Your content</h2>
      <p>
        You own what you save: prompts, memories, notes, code, env files, logs, and projects. You
        give us the permission we need to store, process, search, and display it so the service
        works, including showing it to the people you share it with and to agents you connect. We do
        not use your content to train AI models and we do not sell it.
      </p>
      <p>
        Items you mark as viewable by anyone with the link, or public, can be read by anyone who has
        the URL. Env items are always private and only reach people you add by email.
      </p>

      <h2>Coding agents</h2>
      <p>
        When you connect an agent such as Claude Code, Cursor, or Codex, you authorize it to read
        and change your {APP_NAME} data on your behalf, with the same access you have. You can
        revoke that access by signing out of the agent's connection or from your account. We are not
        responsible for what a third-party agent does with data you let it access.
      </p>

      <h2>Acceptable use</h2>
      <p>Do not use {APP_NAME} to:</p>
      <ul>
        <li>Store or share content that is illegal or that you have no right to share.</li>
        <li>Distribute malware, phishing pages, or credentials that are not yours.</li>
        <li>Harass people, or share their personal data without permission.</li>
        <li>
          Overload, probe, or work around the service's limits, access controls, or payment system.
        </li>
        <li>Resell the hosted service without our written permission.</li>
      </ul>
      <p>We may remove content or suspend accounts that break these rules.</p>

      <h2>Plans and payment</h2>
      <p>
        The Free plan includes the website with up to {LIMITS.free.items} items and{" "}
        {LIMITS.free.projects} project. Pro removes those limits and gives your coding agents access
        to {APP_NAME}. Pro costs {monthly.price} a {monthly.per} or {yearly.price} a {yearly.per}.
        When offered, first-time subscribers pay {INTRO_PRICE} for their first month on the monthly
        plan, then the regular price.
      </p>
      <p>
        Payments are processed by Dodo Payments, which acts as the merchant of record and may add
        applicable taxes. Subscriptions renew automatically until you cancel. You can cancel at any
        time under Settings, Billing, Manage billing; Pro stays active until the end of the period
        you paid for. If you have a billing problem, contact us and we will work it out with you.
      </p>
      <p>
        If your plan ends, nothing you saved is deleted. You keep access to it, and creating more
        than the Free plan allows is paused until you upgrade.
      </p>

      <h2>Changes and availability</h2>
      <p>
        We work to keep {APP_NAME} available and your data safe, but we provide the service "as is"
        and do not guarantee it will be uninterrupted or error free. We may change or discontinue
        features. If we make a change that materially reduces what a paid plan includes, we will
        tell you in advance.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop using {APP_NAME} at any time and ask us to delete your account. We may suspend
        or close accounts that break these terms, after notice where reasonable.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent the law allows, {APP_NAME} and its author are not liable for indirect,
        incidental, or consequential damages, or for lost data or profits. Our total liability for
        any claim is limited to the amount you paid us in the 12 months before the claim.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms. The date at the top shows the latest version, and continuing to
        use the service after an update means you accept it. See also the{" "}
        <Link to="/privacy">Privacy Policy</Link> and the <Link to="/license">License</Link> for the
        source code.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
