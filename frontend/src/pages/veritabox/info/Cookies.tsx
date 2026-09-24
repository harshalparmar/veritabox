import { InfoPage, Section, Reveal } from "@/components/veritabox/InfoPage";

export default function Cookies() {
  return (
    <InfoPage
      kicker="Legal / Cookie Policy"
      title="VeritaBox Cookie Policy"
      subtitle="Last updated: May 31, 2026. This policy explains what cookies are used on the VeritaBox platform and why they are required."
      accent="hsl(var(--primary))"
    >
      <Reveal>
        <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85 space-y-4">
          <p>
            VeritaBox uses cookies and local storage tokens to deliver basic security, state management, and customized theme settings. 
            We do not use tracking cookies or targeting cookies for advertisement purposes.
          </p>
        </div>
      </Reveal>

      <Section eyebrow="01" title="What are Cookies?">
        <Reveal>
          <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85">
            <p>
              Cookies are small text files stored on your browser or device by web servers. They allow websites to remember user preferences, maintain session credentials, and track basic configuration variables across page navigations.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="02" title="How VeritaBox Uses Cookies">
        <Reveal>
          <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85 space-y-3">
            <p>
              We deploy the following essential cookies:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Session Authentication:</strong> JWT authorization tokens are stored in cookies or local storage to keep you securely signed in to your operative dashboard.
              </li>
              <li>
                <strong>Interface Customization:</strong> Local storage is used to keep track of dark/light theme choices (via `next-themes`) and preferences inside the Monaco code editor.
              </li>
              <li>
                <strong>State Cache:</strong> Cache tokens are used to save draft code, minimizing data loss if you accidentally refresh your page during a challenge.
              </li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="03" title="Controlling Cookies">
        <Reveal>
          <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85">
            <p>
              You can disable cookies and local storage in your browser settings. However, doing so will prevent you from signing in to the platform, checking out items from the Arsenal, or saving progress in the Code Forge.
            </p>
          </div>
        </Reveal>
      </Section>
    </InfoPage>
  );
}
