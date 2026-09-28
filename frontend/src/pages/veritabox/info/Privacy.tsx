import { InfoPage, Section, Reveal } from "@/components/veritabox/InfoPage";
import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <InfoPage
      kicker="Legal / Privacy Policy"
      title="Privacy Policy"
      subtitle="Last updated: September 15, 2026. This policy outlines how the VeritaBox platform collects, uses, stores, and protects your personal data."
      accent="hsl(var(--primary))"
    >
      <Reveal>
        <div className="leading-relaxed text-[15px] text-foreground/90 space-y-6 py-2">
          <p>
            At <strong>VeritaBox</strong>, we believe in radical transparency. We collect and store only the data required to track your engineering contributions and run secure hackathons. Your data is hosted on secure infrastructure managed by Operative Network, and we do not sell, license, or monetize your personal information to any third party.
          </p>
        </div>
      </Reveal>

      <Section eyebrow="01" title="Information We Collect">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              To maintain accounts and secure platform operations, the platform records the following categories of data:
            </p>
            <p>
              <strong>Identity Data:</strong> Full name, university ID or email address, password hashes (we never store plaintext passwords), and optional profile avatars.
            </p>
            <p>
              <strong>Integration Data:</strong> Public GitHub usernames or repository links connected during Code Forge challenges or Hackathons. We only access public profile data through OAuth scopes.
            </p>
            <p>
              <strong>Telemetry and Code Logs:</strong> Compilation outcomes, code editor snapshots during competitions for anti-cheat proctoring, sandbox performance metrics, and submission timestamps.
            </p>
            <p>
              <strong>Usage Data:</strong> Page views, feature usage patterns, session duration, and device or browser type. This data is aggregated and anonymized for platform improvement.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="02" title="How Data is Utilized">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              The collected information is solely used to facilitate platform operations:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Populating the public leaderboard, ranking operative profiles, and displaying solve metrics.</li>
              <li>Validating project and challenge submissions for correctness, originality, and anti-cheat compliance.</li>
              <li>Issuing digital certificates for completed hackathons and competitions.</li>
              <li>Auditing security logs to prevent platform tampering and unauthorized access.</li>
              <li>Sending platform notifications such as event reminders, submission results, and system announcements.</li>
              <li>Improving platform performance, fixing bugs, and developing new features based on aggregate usage patterns.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="03" title="Data Storage & Security">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              All data is stored on servers managed by Operative Network. No personal data is transferred to external cloud providers without your consent.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Passwords are hashed using bcrypt with industry-standard salt rounds before storage.</li>
              <li>Authentication is handled via JWT tokens with configurable expiration windows.</li>
              <li>All connections to the platform are encrypted via HTTPS and TLS.</li>
              <li>Database backups are performed regularly and stored securely with restricted access.</li>
              <li>Administrative access to production data is logged and auditable.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="04" title="Data Sharing & Third Parties">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              Your data stays within the Operative Network infrastructure boundary with the following exceptions:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>If you sign in with Google, your public profile information (name, email, avatar) is received from Google. We do not share data back.</li>
              <li>If you link your GitHub account, we access only your public profile and repositories as authorized by you.</li>
              <li>We do not share records with external advertising platforms, data brokers, or analytics services.</li>
              <li>Profile details and leaderboard standings are visible to other logged-in VeritaBox members to foster collaborative accountability.</li>
              <li>We may disclose data if required by law, court order, or university disciplinary proceedings.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="05" title="Data Retention">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <ul className="list-disc pl-5 space-y-2">
              <li>Active accounts: data is retained for the duration of your active platform membership.</li>
              <li>Inactive accounts: accounts with no login activity for 12 months after university departure may be archived.</li>
              <li>Competition submissions and leaderboard entries are retained indefinitely as part of the platform's historical record.</li>
              <li>Security and audit logs are retained for a minimum of 6 months.</li>
              <li>Deleted account data is permanently purged within 30 days of an approved deletion request.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="06" title="Your Rights">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              You have the following rights regarding your personal data:
            </p>
            <p>
              <strong>Access:</strong> Request a copy of all personal data we hold about you. <strong>Correction:</strong> Update or correct inaccurate personal information through your profile settings. <strong>Deletion:</strong> Request deletion of your account and purge of all associated logs and submissions. <strong>Portability:</strong> Request an export of your submissions, projects, and profile data in a standard format. <strong>Objection:</strong> Opt out of non-essential data processing by contacting platform administrators.
            </p>
            <p>
              To exercise any of these rights, contact us at <a href="mailto:info@anuragya.com" className="text-primary hover:underline underline-offset-4 transition-colors">info@anuragya.com</a> or through our <Link to="/contact" className="text-primary hover:underline underline-offset-4 transition-colors">Contact page</Link>.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="07" title="Updates to This Policy">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              We may update this Privacy Policy periodically. Material changes will be communicated through platform notifications. Continued use of the platform after changes take effect constitutes acceptance of the updated policy.
            </p>
            <p>
              For more details about cookies and local storage, see our <Link to="/cookies" className="text-primary hover:underline underline-offset-4 transition-colors">Cookie Policy</Link>.
            </p>
          </div>
        </Reveal>
      </Section>
    </InfoPage>
  );
}
