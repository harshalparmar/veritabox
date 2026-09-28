import { InfoPage, Section, Reveal } from "@/components/veritabox/InfoPage";
import { Link } from "react-router-dom";

export default function Contact() {
  return (
    <InfoPage
      kicker="Support / Contact"
      title="Get in touch with us."
      subtitle="Whether you have a question, a bug report, or a partnership inquiry, we route everything to a real human within one working day."
      accent="hsl(var(--info))"
    >
      <Reveal>
        <div className="leading-relaxed text-[15px] text-foreground/90 space-y-6 py-2">
          <p>
            We're a small team and we read every message that comes in. Whether you're reporting a platform bug, asking about a feature, or exploring a collaboration, reach out through any of the channels below and we'll get back to you.
          </p>
        </div>
      </Reveal>

      <Section eyebrow="01" title="General Inquiries">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              For general questions about the platform, partnerships, press inquiries, or anything that doesn't fit the categories below, write to us at <a href="mailto:info@anuragya.com" className="text-primary hover:underline underline-offset-4 transition-colors">info@anuragya.com</a>.
            </p>
            <p>
              This inbox is monitored during business hours, Monday through Friday, 10:00 to 18:00 IST. Expect a response within one working day.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="02" title="Technical Support">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              If you've encountered a bug, have trouble accessing your account, or need help with a platform feature, reach out to our technical support team at <a href="mailto:support@anuragya.com" className="text-primary hover:underline underline-offset-4 transition-colors">support@anuragya.com</a>.
            </p>
            <p>
              When reporting a bug, include as much detail as possible: what you were doing, what you expected to happen, and what actually happened. Screenshots or screen recordings are always helpful. If you have an existing ticket ID, include it in the subject line so we can pick up where we left off.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="03" title="Business & Enterprise">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              For custom deployments, institutional licensing, or enterprise-scale event hosting, contact us at <a href="mailto:info@anuragya.com" className="text-primary hover:underline underline-offset-4 transition-colors">info@anuragya.com</a> with "Enterprise" in the subject line.
            </p>
            <p>
              We work with universities, technical communities, and organizations that need a customized version of the platform tailored to their specific workflows and branding requirements.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="04" title="Report a Violation">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              If you need to report a <Link to="/conduct" className="text-primary hover:underline underline-offset-4 transition-colors">Code of Conduct</Link> violation, harassment, or any safety concern, contact your chapter administrator or faculty advisor directly. You can also reach us at <a href="mailto:support@anuragya.com" className="text-primary hover:underline underline-offset-4 transition-colors">support@anuragya.com</a>. All reports are treated confidentially.
            </p>
          </div>
        </Reveal>
      </Section>

      <Reveal>
        <div className="leading-relaxed text-[15px] text-foreground/90 space-y-6 pt-4 border-t border-border/40">
          <p>
            <strong>Organization:</strong> VeritaBox, operated by Operative Network, a vertical of Anuragya Pvt. Ltd.
          </p>
          <p>
            <strong>Support hours:</strong> Monday through Friday, 10:00 to 18:00 IST.
          </p>
        </div>
      </Reveal>
    </InfoPage>
  );
}
