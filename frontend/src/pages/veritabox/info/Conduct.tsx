import { InfoPage, Section, Reveal } from "@/components/veritabox/InfoPage";
import { Link } from "react-router-dom";

export default function Conduct() {
  return (
    <InfoPage
      kicker="Community / Code of Conduct"
      title="Code of Conduct"
      subtitle="Last updated: September 15, 2026. The values and rules that guide all members of the VeritaBox community."
      accent="hsl(var(--warning))"
    >
      <Reveal>
        <div className="leading-relaxed text-[15px] text-foreground/90 space-y-6 py-2">
          <p>
            VeritaBox is built on <strong>collaboration, safety, and mutual respect</strong>. As builders, engineers, and programmers, we are collectively responsible for maintaining a supportive and safe workspace. This Code of Conduct applies to all communication channels, project interactions, hackathons, competitions, workshops, events, and all platform activity under the VeritaBox umbrella.
          </p>
        </div>
      </Reveal>

      <Section eyebrow="01" title="Our Pledge">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              We as members, contributors, and leaders pledge to make participation in VeritaBox a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.
            </p>
            <p>
              We pledge to act in ways that contribute to an open, welcoming, diverse, inclusive, and healthy community.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="02" title="Safety First">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              Operating hardware carries real physical risks. All members must adhere to strict safety codes:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Drone Flights:</strong> Never test a UAV or run high-throttle rotor blades indoors. All flight tests must occur at designated university flight locations with active safety spotters.</li>
              <li><strong>Battery Management:</strong> LiPo batteries must never be left charging unattended. Visually check for swelling or puffiness, and immediately report compromised packs for safe disposal.</li>
              <li><strong>Lab and Incubation Space:</strong> Maintain cleanliness at lab benches, return soldering irons to their stands, and turn off power supplies after completing your shift.</li>
              <li><strong>Personal Protective Equipment:</strong> Use appropriate PPE when soldering, handling chemicals, or working with power tools.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="03" title="Academic Integrity & Original Work">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              We pride ourselves on original work and technical rigor.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Do not plagiarize circuit designs, CAD components, firmware logic, or software code.</li>
              <li>When referencing open-source projects or libraries, cite your sources clearly in your documentation and commit messages.</li>
              <li>AI-assisted code must be disclosed. Mark AI-generated sections and take responsibility for verifying their correctness.</li>
              <li>Malicious code, intentional platform sabotage, or tampering with another member's repository will result in immediate expulsion from the collective.</li>
              <li>During competitions and proctored events, follow all stated rules regarding tools, references, and collaboration.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="04" title="Professional Collaboration">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              VeritaBox stands for zero discrimination. We foster a community that welcomes diverse skill levels:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Support beginners during onboarding. Everyone starts somewhere, and mentorship is valued as highly as individual expertise.</li>
              <li>Constructive, objective criticism during peer audits and code reviews is welcome. Personal attacks, harassment, or elitist behavior are not tolerated.</li>
              <li>Communicate clearly, respect deadlines during collaborative hackathons, and contribute fairly to shared code canvases.</li>
              <li>Give credit where credit is due. Acknowledge contributions from teammates and collaborators in project documentation.</li>
              <li>Respect different perspectives and approaches to problem-solving. Technical disagreements should be resolved through evidence and discussion, not authority.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="05" title="Communication Standards">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              All communication on the platform, including messages, project comments, and event discussions, must adhere to these standards:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Use professional, inclusive language. Avoid slurs, profanity, and derogatory remarks.</li>
              <li>Do not spam channels with irrelevant content, advertisements, or unsolicited promotions.</li>
              <li>Respect privacy. Do not share screenshots of private messages or confidential project details without consent.</li>
              <li>Disagreements should remain technical and impersonal. Attack the problem, not the person.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="06" title="Reporting & Enforcement">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              Violations can be reported directly to chapter administrators, faculty advisors, or through the platform's secure feedback system. All reports are treated confidentially.
            </p>
            <p>
              Sanctions are applied based on severity and follow a graduated enforcement model:
            </p>
            <p>
              <strong>Level 1, Warning.</strong> First-time minor violations. A written warning with clarification of expectations.
            </p>
            <p>
              <strong>Level 2, Temporary Suspension.</strong> Repeated or moderate violations. Account suspension for 7 to 30 days.
            </p>
            <p>
              <strong>Level 3, Permanent Ban.</strong> Severe or repeated violations. Total platform ban and permanent removal from the community.
            </p>
            <p>
              For questions about this Code of Conduct, contact us through our <Link to="/contact" className="text-primary hover:underline underline-offset-4 transition-colors">Contact page</Link>.
            </p>
          </div>
        </Reveal>
      </Section>
    </InfoPage>
  );
}
