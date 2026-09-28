import { InfoPage, Section, Reveal } from "@/components/veritabox/InfoPage";
import { Link } from "react-router-dom";

export default function Cookies() {
  return (
    <InfoPage
      kicker="Legal / Cookie Policy"
      title="Cookie Policy"
      subtitle="Last updated: September 15, 2026. This policy explains what cookies and local storage mechanisms are used on the VeritaBox platform."
      accent="hsl(var(--primary))"
    >
      <Reveal>
        <div className="leading-relaxed text-[15px] text-foreground/90 space-y-6 py-2">
          <p>
            VeritaBox uses cookies and local storage tokens to deliver basic security, state management, and customized theme settings. We do not use tracking cookies or targeting cookies for advertisement purposes. Every cookie and storage key on this platform serves a functional purpose.
          </p>
        </div>
      </Reveal>

      <Section eyebrow="01" title="What are Cookies?">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              Cookies are small text files stored on your browser or device by web servers. They allow websites to remember user preferences, maintain session credentials, and track basic configuration variables across page navigations.
            </p>
            <p>
              Local storage is a similar browser-based mechanism that stores data as key-value pairs. Unlike cookies, local storage data is not sent to the server with each request, making it more efficient for client-side preferences.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="02" title="What We Use">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              VeritaBox uses only essential storage. Here is a complete list:
            </p>
            <p>
              <strong>Authentication Token:</strong> A JWT token stored in local storage that keeps you signed in to the platform. Expires based on session configuration, typically after 7 days of inactivity.
            </p>
            <p>
              <strong>Theme Preference:</strong> Your dark or light mode choice is saved in local storage so the platform remembers your visual preference between sessions.
            </p>
            <p>
              <strong>Code Forge Drafts:</strong> When you're working on a challenge in the Code Forge, your draft code is periodically saved to local storage. This prevents data loss if you accidentally refresh the page or close the browser.
            </p>
            <p>
              <strong>Editor Settings:</strong> Monaco editor customizations such as font size, tab width, and word wrap preference are stored locally so they persist across sessions.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="03" title="Third-Party Cookies">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              If you sign in via Google OAuth, Google may set its own cookies during the authentication flow. These cookies are governed by Google's own privacy policy and are outside our control.
            </p>
            <p>
              VeritaBox does not embed any third-party analytics, advertising, or social media tracking scripts. No data is shared with external advertising platforms or data brokers through cookies or any other mechanism.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="04" title="Managing Cookies">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              You can disable cookies and local storage in your browser settings. However, doing so will impact the following functionality:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>You will not be able to sign in or maintain an active session.</li>
              <li>The platform will default to your system theme on every visit instead of remembering your choice.</li>
              <li>Draft code in the Code Forge will not be saved between sessions, and you risk losing unsaved work on page refresh.</li>
              <li>Editor customizations will reset on each visit.</li>
            </ul>
            <p>
              Since we use no tracking or advertising cookies, there are no non-essential cookies to decline. We recommend keeping essential cookies enabled for the best experience.
            </p>
          </div>
        </Reveal>
      </Section>

      <Reveal>
        <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4 pt-4 border-t border-border/40">
          <p>
            For more details about how we handle your data, see our <Link to="/privacy" className="text-primary hover:underline underline-offset-4 transition-colors">Privacy Policy</Link>. For any questions, visit our <Link to="/contact" className="text-primary hover:underline underline-offset-4 transition-colors">Contact page</Link>.
          </p>
        </div>
      </Reveal>
    </InfoPage>
  );
}
