import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalPage } from "#/components/site-chrome.tsx";
import { APP_NAME, CONTACT_EMAIL, LEGAL_UPDATED } from "#/lib/site.ts";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: `Privacy Policy · ${APP_NAME}` }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={LEGAL_UPDATED}>
      <p>
        This policy explains what {APP_NAME} collects, why, and what you can do about it. The short
        version: we keep what the service needs to work, we do not sell your data, we do not show
        ads, and we do not use your content to train AI models.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details</strong> from GitHub or Google when you sign in: your name, email
          address, profile picture, and the provider's account ID.
        </li>
        <li>
          <strong>Your content</strong>: items, their version history, tags, projects, live log
          entries, and who you share them with, including the email addresses you invite.
        </li>
        <li>
          <strong>Sign-in sessions</strong>: the IP address and browser of each session, so you can
          review and sign out devices in Settings.
        </li>
        <li>
          <strong>Agent connections</strong>: the agents you authorize and the access tokens they
          use.
        </li>
        <li>
          <strong>Billing records</strong>: your plan, subscription status, and renewal date from
          Dodo Payments. We never see or store your card details.
        </li>
        <li>
          <strong>Request logs</strong>: the page or API path, response status, timing, and rough
          location such as country, used to keep the service running and debug problems.
        </li>
      </ul>

      <h2>How we protect it</h2>
      <p>
        Everything travels over HTTPS. Env items are encrypted before they are stored, and are only
        decrypted to show them to you and the people you share them with. Other content is stored as
        you wrote it so it can be searched and shared.
      </p>

      <h2>Who else processes it</h2>
      <ul>
        <li>
          <strong>Cloudflare</strong> hosts the app, its database, and request logs.
        </li>
        <li>
          <strong>GitHub and Google</strong> handle sign-in.
        </li>
        <li>
          <strong>Dodo Payments</strong> processes subscriptions as the merchant of record, under
          its own privacy policy.
        </li>
        <li>
          <strong>People and agents you choose</strong>: collaborators you share with, anyone with
          the link to items you make link-viewable or public, and coding agents you connect.
        </li>
      </ul>
      <p>We do not sell personal data or share it with advertisers.</p>

      <h2>Cookies</h2>
      <p>
        We use one sign-in cookie to keep you logged in, and your browser's local storage to
        remember your theme. There are no advertising or cross-site tracking cookies.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Your content stays until you delete it. Deleting an item removes it, its history, and
        everyone's access. Database backups that may still contain deleted data are kept for up to
        30 days. Request logs are kept for a short period by Cloudflare.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>View, copy, edit, or delete your items at any time.</li>
        <li>Sign out other devices and see connected sign-in methods in Settings, Security.</li>
        <li>
          Ask us for a copy of your data, or to delete your account and everything in it, by
          emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </li>
      </ul>
      <p>
        Depending on where you live, you may have further rights, such as correcting your data or
        objecting to how it is processed. Contact us and we will help.
      </p>

      <h2>Children</h2>
      <p>
        {APP_NAME} is not meant for children under 13, and we do not knowingly collect their data.
      </p>

      <h2>Changes</h2>
      <p>
        We will update this page when our practices change and adjust the date at the top. Related:{" "}
        <Link to="/terms">Terms of Service</Link>.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
