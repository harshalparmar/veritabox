import { InfoPage, Section, Reveal } from "@/components/VeritaBox/InfoPage";

export default function Conduct() {
  return (
    <InfoPage
      kicker="Community / Code of Conduct"
      title="VeritaBox Code of Conduct"
      subtitle="Last updated: May 31, 2026. The values and rules that guide all operatives in Indira University's robotics, hardware, and software ecosystem."
      accent="hsl(var(--warning))"
    >
      <Reveal>
        <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85 space-y-4">
          <p>
            VeritaBox is built on collaboration, safety, and mutual respect. As builders, drone pilots, and programmers, we are collectively responsible for maintaining a supportive and safe workspace.
          </p>
          <p>
            This Code of Conduct applies to all communication channels, project forge files, in-person flights, and hackathons under the VeritaBox umbrella.
          </p>
        </div>
      </Reveal>

      <Section eyebrow="01" title="Safety First (Hardware & Field Operations)">
        <Reveal>
          <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85 space-y-3">
            <p>
              Operating hardware carries real physical risks. Operatives must adhere to strict safety codes:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Drone Flights:</strong> Never test a UAV or run high-throttle rotor blades indoors. All flight tests must occur at designated university flight locations with active safety spotters.
              </li>
              <li>
                <strong>Battery Management:</strong> LiPo batteries must never be left charging unattended. Visually check for battery swelling or puffiness, and immediately report compromised packs for safe disposal.
              </li>
              <li>
                <strong>Incubation Space:</strong> Maintain cleanliness in lab benches, return soldering irons to their stands, and turn off power supplies after completing your shift.
              </li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="02" title="Academic Integrity & Original Craft">
        <Reveal>
          <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85 space-y-3">
            <p>
              We pride ourselves on original work and technical rigor.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Do not plagiarize circuit designs, CAD components, or firmware logic.</li>
              <li>When referencing open-source flight stacks (e.g. ArduPilot, PX4) or libraries, cite your sources clearly.</li>
              <li>Malicious code, intentional platform sabotage, or tampering with another member's repository will result in immediate expulsion from the collective.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="03" title="Professional Collaboration">
        <Reveal>
          <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85 space-y-3">
            <p>
              VeritaBox stands for zero discrimination. We foster a community that welcomes diverse skill levels:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Support beginners during onboarding and inventory requisition.</li>
              <li>Constructive, objective criticism during peer audits and code reviews is welcome. Personal attacks, harassment, or elitist behavior are not tolerated.</li>
              <li>Communicate clearly, respect deadlines during collaborative squadron hackathons, and contribute fairly to shared code canvases.</li>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="04" title="Reporting & Consequences">
        <Reveal>
          <div className="bg-card border border-border rounded-md p-6 leading-relaxed text-[13.5px] text-foreground/85">
            <p>
              Violations can be reported directly to chapter administrators, faculty advisors, or via secure platform feedback. 
              Sanctions range from warnings and temporary account suspensions to total asset requisition bans and reporting to Indira University's disciplinary board.
            </p>
          </div>
        </Reveal>
      </Section>
    </InfoPage>
  );
}
