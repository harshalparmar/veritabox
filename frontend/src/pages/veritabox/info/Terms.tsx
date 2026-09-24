import { InfoPage, Section, Reveal } from "@/components/veritabox/InfoPage";

export default function Terms() {
  return (
    <InfoPage
      kicker="Legal / Terms of Service"
      title="VeritaBox Terms of Service"
      subtitle="Last updated: May 31, 2026. These Terms govern your access to and use of the VeritaBox platform, including its hackathons and bounties."
      accent="hsl(var(--primary))"
    >
      <Reveal>
        <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85 space-y-4">
          <p>
            Welcome to <strong>VeritaBox</strong> (शून्य), the operative platform for hardware and software builders at Indira University. 
            By enlisting, registering, or accessing any sub-component of this platform, you agree to comply with and be bound by these Terms of Service.
          </p>
          <p>
            If you do not agree to these terms, you are not authorized to compete in platform hackathons or claim bounty awards.
          </p>
        </div>
      </Reveal>

      <Section eyebrow="01" title="Platform Enrollment & Academic Standing">
        <Reveal>
          <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85 space-y-3">
            <p>
              Access to VeritaBox's internal tools (such as the Forge and Bounties) is restricted to active student builders, faculty advisors, and registered chapter members of Indira University.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must maintain an active university email address to log in and sync your operative profile.</li>
              <li>Suspension or academic disciplinary actions by Indira University will result in temporary or permanent revocation of VeritaBox platform privileges.</li>
              <li>You are solely responsible for all actions taken under your cryptographic keys or account credentials.</li>
            </ul>
          </div>
        </Reveal>
      </Section>



      <Section eyebrow="02" title="Bounties, Code Forge, and Intellectual Property">
        <Reveal>
          <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85 space-y-3">
            <p>
              Code submitted to the <strong>Code Forge</strong> or as part of a <strong>Bounty Mission</strong> must represent your original work or be appropriately licensed under open-source standards.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Plagiarism, copy-pasting of undisclosed code, or submission of AI-generated work without authorization is strictly prohibited and constitutes an honor code violation.</li>
              <li>Unless specified otherwise, contributions to VeritaBox platform repositories or public bounties are licensed under the MIT License to allow the community to benefit.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="03" title="Termination of Access">
        <Reveal>
          <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85">
            <p>
              We reserve the right to suspend or terminate platform access instantly for any operative who tampers with other members' code bases, or acts in a manner contrary to the VeritaBox Code of Conduct.
            </p>
          </div>
        </Reveal>
      </Section>
    </InfoPage>
  );
}
