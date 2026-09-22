import { InfoPage, Section, Reveal } from "@/components/VeritaBox/InfoPage";

export default function Privacy() {
  return (
    <InfoPage
      kicker="Legal / Privacy Policy"
      title="VeritaBox Privacy Policy"
      subtitle="Last updated: May 31, 2026. This policy outlines how the VeritaBox platform handles operative data and telemetry logs."
      accent="hsl(var(--primary))"
    >
      <Reveal>
        <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85 space-y-4">
          <p>
            At <strong>VeritaBox</strong>, we believe in radical transparency. We collect and store only the data required to track your engineering contributions and run secure hackathons.
          </p>
          <p>
            Your data is hosted locally at Indira University, and we do not sell, license, or monetize your personal details.
          </p>
        </div>
      </Reveal>

      <Section eyebrow="01" title="Information We Collect">
        <Reveal>
          <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85 space-y-3">
            <p>
              To maintain accounts and secure platform operations, the platform records:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Identity Data:</strong> Full name, university ID/email address, password hashes, and optional operative profile avatars.
              </li>
              <li>
                <strong>Integration Data:</strong> Public GitHub usernames or repository links connected during Forge challenges or Hackathons.
              </li>

              <li>
                <strong>Telemetry & Code Logs:</strong> Compilation outcomes, Monaco editor code snapshots, and performance stats compiled from sandbox testing.
              </li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="02" title="How Data is Utilized">
        <Reveal>
          <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85 space-y-3">
            <p>
              The collected information is solely used to facilitate platform operations:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Populating the public leaderboard, ranking operative profiles, and displaying commit metrics.</li>
              <li>Validating project submissions and issuing digital verification certificates.</li>
              <li>Auditing security logs to prevent platform tampering.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="03" title="Data Boundaries & Sharing">
        <Reveal>
          <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85">
            <p>
              Your data stays within the Indira University network boundary. We do not share records with external advertising platforms. Profile details and leaderboard standings are visible to other logged-in VeritaBox members to foster collaborative accountability.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="04" title="Your Rights">
        <Reveal>
          <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85">
            <p>
              You have the right to request deletion of your account and purge any associated logs upon leaving the university.
            </p>
          </div>
        </Reveal>
      </Section>
    </InfoPage>
  );
}
