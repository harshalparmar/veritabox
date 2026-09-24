import { InfoPage, Reveal } from "@/components/veritabox/InfoPage";

export default function About() {
  return (
    <InfoPage
      kicker="Company / About"
      title="Redefining educational technology and interactive event hosting."
      subtitle="VeritaBox is a next-generation digital platform engineered by VeritaBox — the specialized IT and cloud infrastructure wing of Anuragya Private Limited."
      accent="hsl(var(--warning))"
    >
      <Reveal>
        <div className="leading-relaxed text-[15px] text-foreground/90 space-y-6 py-2">
          <p>
            <strong>VeritaBox</strong> is a next-generation digital platform designed to redefine educational technology and interactive event hosting. At our core, we believe that technology should empower rather than complicate. Our mission is to provide educators, creators, and forward-thinking enterprises with state-of-the-art tools to effortlessly manage comprehensive ed-tech curriculums, host high-capacity events, and foster meaningful audience engagement.
          </p>
          <p>
            Developed and engineered by <strong><a href="https://veritabox.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline transition-colors">VeritaBox</a></strong>, a specialized IT and cloud infrastructure division, VeritaBox is built for high-performance, security, and scalability. VeritaBox ensures that the platform remains reliable and cutting-edge, handling everything from real-time analytics to enterprise-grade security.
          </p>
          <p>
            VeritaBox is proudly backed by the technological ecosystem, engineering rigor, and long-term vision of <strong><a href="https://www.anuragya.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline transition-colors">Anuragya Private Limited</a></strong>. As our parent company, Anuragya Private Limited provides the foundation that allows us to deliver intuitive infrastructure tailored for the future of digital interaction.
          </p>
        </div>
      </Reveal>
    </InfoPage>
  );
}
