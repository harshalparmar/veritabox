import { InfoPage, Section, Reveal } from "@/components/veritabox/InfoPage";
import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <InfoPage
      kicker="Legal / Terms of Service"
      title="Terms of Service"
      subtitle="Last updated: September 15, 2026. These Terms govern your access to and use of the VeritaBox platform, including hackathons, bounties, Code Forge, and all associated services."
      accent="hsl(var(--primary))"
    >
      <Reveal>
        <div className="leading-relaxed text-[15px] text-foreground/90 space-y-6 py-2">
          <p>
            Welcome to <strong>VeritaBox</strong>, the operative platform for hardware and software builders, owned and operated by Operative Network, a vertical of Anuragya Private Limited. By enlisting, registering, or accessing any sub-component of this platform, you agree to comply with and be bound by these Terms of Service.
          </p>
          <p>
            If you do not agree to these terms, you are not authorized to compete in platform hackathons, claim bounty awards, or access restricted platform features.
          </p>
        </div>
      </Reveal>

      <Section eyebrow="01" title="Eligibility & Enrollment">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              Access to VeritaBox's internal tools, including the Code Forge, Bounties, and Hackathons, is restricted to registered members and chapter participants of the platform.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>You must maintain an active university email address to log in and sync your operative profile.</li>
              <li>Violation of platform rules or community guidelines may result in temporary or permanent revocation of VeritaBox platform privileges.</li>
              <li>You must be at least 16 years of age to create an account on the platform.</li>
              <li>Guest access may be granted for specific public events at the discretion of platform administrators.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="02" title="Account Responsibilities">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              You are solely responsible for all actions taken under your account credentials, including API keys and authentication tokens.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Keep your login credentials confidential. Do not share your account with others or allow multiple people to use a single account.</li>
              <li>Notify platform administrators immediately if you suspect unauthorized access to your account.</li>
              <li>You agree to provide accurate and current information during registration and to update it as necessary.</li>
              <li>Inactive accounts with no login for 12 or more months after university departure may be archived and associated data purged.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="03" title="Intellectual Property">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              Code submitted to the <strong>Code Forge</strong> or as part of a <strong>Bounty Mission</strong> must represent your original work or be appropriately licensed under open-source standards.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Plagiarism, copy-pasting of undisclosed code, or submission of AI-generated work without proper authorization and disclosure is strictly prohibited and constitutes an honor code violation.</li>
              <li>Unless specified otherwise, contributions to VeritaBox platform repositories or public bounties are licensed under the MIT License to allow the community to benefit.</li>
              <li>You retain ownership of code you write. By submitting to the platform, you grant VeritaBox a non-exclusive, royalty-free license to display and evaluate your submissions.</li>
              <li>VeritaBox branding, logos, and platform design are proprietary. Unauthorized reproduction or distribution is prohibited.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="04" title="Competitions & Bounties">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              All competition submissions are subject to anti-cheat proctoring. Violations detected during or after an event may result in disqualification and reputation penalties.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Bounty rewards in the form of reputation points are non-transferable and cannot be exchanged for monetary value.</li>
              <li>Team compositions for hackathons must be finalized before the event start time. Late changes require admin approval.</li>
              <li>Disputes regarding scores, rankings, or disqualifications must be raised within 48 hours of results publication.</li>
              <li>VeritaBox reserves the right to modify reward structures, event rules, or competition formats with reasonable notice.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="05" title="Acceptable Use">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              You agree not to use the platform to:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Upload malicious code, scripts, or files that could harm the platform, its users, or university infrastructure.</li>
              <li>Attempt to exploit vulnerabilities, bypass access controls, or perform unauthorized penetration testing without explicit written consent from platform administrators.</li>
              <li>Use the Code Forge sandbox environment to mine cryptocurrency, host external services, or perform denial-of-service attacks.</li>
              <li>Harass, bully, or discriminate against other platform members through messages, comments, or project interactions.</li>
              <li>Scrape, crawl, or programmatically extract platform data without authorization.</li>
              <li>Impersonate other users, administrators, or faculty members.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="06" title="Termination of Access">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              We reserve the right to suspend or terminate platform access for any operative who tampers with other members' code bases, acts in a manner contrary to the <Link to="/conduct" className="text-primary hover:underline underline-offset-4 transition-colors">VeritaBox Code of Conduct</Link>, repeatedly violates these Terms after receiving warnings, or is found to have provided false information during registration.
            </p>
            <p>
              Upon termination, you may request a copy of your submitted code and personal data within 30 days. After this period, associated data may be permanently deleted.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="07" title="Disclaimers & Limitation of Liability">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <ul className="list-disc pl-5 space-y-2">
              <li>The platform is provided "as is" without warranties of any kind, express or implied. We do not guarantee uninterrupted access or error-free operation.</li>
              <li>VeritaBox is not liable for data loss resulting from server failures, user error, or force majeure events.</li>
              <li>The platform may undergo scheduled maintenance windows during which services will be temporarily unavailable.</li>
              <li>Third-party integrations such as GitHub and Google OAuth are subject to their own terms and privacy policies.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="08" title="Changes to These Terms">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              We may update these Terms from time to time. Material changes will be communicated through platform notifications and email. Continued use of the platform after changes take effect constitutes acceptance of the updated Terms.
            </p>
            <p>
              For questions about these terms, contact us at <a href="mailto:info@anuragya.com" className="text-primary hover:underline underline-offset-4 transition-colors">info@anuragya.com</a> or through our <Link to="/contact" className="text-primary hover:underline underline-offset-4 transition-colors">Contact page</Link>.
            </p>
          </div>
        </Reveal>
      </Section>
    </InfoPage>
  );
}
