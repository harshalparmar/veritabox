import { InfoPage, Section, Reveal } from "@/components/veritabox/InfoPage";
import { Link } from "react-router-dom";

export default function Platform() {
  return (
    <InfoPage
      kicker="Platform / Overview"
      title="Everything you need to build, compete, and grow."
      subtitle="VeritaBox is a unified platform for learning, hackathons, competitions, project collaboration, and community engagement, built for students, educators, and builders."
      accent="hsl(var(--primary))"
    >
      <Reveal>
        <div className="leading-relaxed text-[15px] text-foreground/90 space-y-6 py-2">
          <p>
            <strong>VeritaBox</strong> brings together every tool a modern technical community needs under one roof. Instead of juggling a dozen platforms for coding practice, event management, team collaboration, and learning resources, VeritaBox provides a single, cohesive environment where all of these systems work together and share context.
          </p>
          <p>
            The platform is organized into focused modules, each designed to serve a specific purpose while remaining deeply connected to the rest of the ecosystem. Your reputation, achievements, and progress carry across all modules. Solving a Code Forge challenge earns you the same reputation points that winning a hackathon does.
          </p>
        </div>
      </Reveal>

      <Section eyebrow="Learning" title="Learning Modules">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-6">
            <p>
              The learning system on VeritaBox is designed around structured, self-paced progression. Rather than offering disconnected courses, everything ties together. Tutorials feed into practice challenges, roadmaps guide your learning path, and daily checklists keep you consistent.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="01" title="Roadmaps">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              <strong>Roadmaps</strong> are curated learning paths that guide you from beginner to advanced in a specific domain, whether that's web development, data structures, embedded systems, or machine learning. Each roadmap breaks a large topic into sequential milestones with recommended tutorials, challenges, and projects at each stage.
            </p>
            <p>
              Your progress is tracked automatically as you complete linked content. Roadmaps are created by administrators and experienced members, ensuring they reflect real-world skill requirements rather than arbitrary curricula.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="02" title="Daily Checklist">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              The <strong>Daily Checklist</strong> is a lightweight habit-tracking tool that helps you maintain consistent learning momentum. Each day, the platform generates a personalized set of tasks based on your active roadmap, incomplete challenges, and upcoming event deadlines.
            </p>
            <p>
              Completing daily tasks builds streaks that are visible on your profile and contribute to your reputation score. The checklist is intentionally small, usually three to five items, so it stays achievable without becoming overwhelming.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="03" title="Tutorials">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              <strong>Tutorials</strong> are long-form technical articles organized by category and difficulty level. Each tutorial covers a concept with theory, worked examples, and step-by-step explanations. Tutorials are written in a reference style similar to documentation sites, designed to be read, bookmarked, and revisited.
            </p>
            <p>
              Where applicable, tutorials link directly to related Code Forge challenges so you can immediately practice what you've read. The system also auto-matches tutorials to challenges based on shared tags when no explicit link exists.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="04" title="Knowledge Hub">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              The <strong>Knowledge Hub</strong> is a searchable library of articles, guides, and reference material maintained by administrators and community contributors. Unlike tutorials which follow a teaching structure, knowledge hub entries are reference documents: quick lookups for syntax, configuration, API usage, and best practices.
            </p>
            <p>
              The knowledge hub supports full-text search, category browsing, and tag-based filtering. It serves as the platform's internal documentation layer, covering everything from platform usage guides to technical reference material.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="Compete" title="Competitions & Challenges">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-6">
            <p>
              VeritaBox provides multiple competitive formats to suit different skill levels and interests. Whether you prefer solo coding challenges, team-based hackathons, or open-ended bounty missions, there's a format that fits.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="05" title="Code Forge">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              <strong>Code Forge</strong> is the platform's integrated coding challenge environment. It provides a browser-based code editor with a problem statement, constraints, example inputs and outputs, and an automated test runner. You can write, run, and submit solutions in multiple programming languages without leaving the browser.
            </p>
            <p>
              Challenges are categorized by difficulty (Rookie, Operative, and Elite) and tagged by topic for easy filtering. Each successful solve earns reputation points. Code Forge is publicly browsable so anyone can explore the problem catalog, but running and submitting code requires a signed-in account.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="06" title="Hackathons">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              <strong>Hackathons</strong> are time-bound team events where participants build projects from scratch around a given theme or problem statement. VeritaBox handles the full lifecycle: team formation, registration, project submission, judging, and results.
            </p>
            <p>
              Teams are managed through the platform's squadron system. Members can form teams, invite others, and collaborate through integrated messaging. Hackathon submissions include project descriptions, repository links, and optional demo materials. Judges evaluate submissions through a structured rubric system.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="07" title="Competitions">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              <strong>Competitions</strong> are structured, proctored events that test individual or team skills under controlled conditions. Unlike hackathons which emphasize building, competitions focus on problem-solving speed and accuracy with real-time leaderboards and anti-cheat proctoring.
            </p>
            <p>
              Competition formats include timed coding rounds, quiz-style assessments, and multi-stage elimination events. Results feed into the platform's ranking system, and top performers earn reputation rewards and digital certificates.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="08" title="Bounties">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              <strong>Bounties</strong> are open-ended missions posted by administrators or faculty that reward participants for completing specific technical tasks. Unlike challenges with fixed test cases, bounties are evaluated by reviewers and may involve building features, fixing bugs, writing documentation, or conducting research.
            </p>
            <p>
              Each bounty has a defined reputation reward, a deadline, and submission criteria. Multiple participants can attempt the same bounty, and rewards are distributed based on the quality and completeness of submissions.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="Build" title="Project & Lab Tools">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-6">
            <p>
              Beyond learning and competing, VeritaBox provides tools for building real projects and working with hardware. These modules support the hands-on side of engineering education.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="09" title="Circuit Lab">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              <strong>Circuit Lab</strong> is the platform's electronics and hardware design workspace. It provides tools for circuit simulation, component documentation, and hardware project tracking. Circuit Lab bridges the gap between software-focused platform features and the physical engineering work that many members are involved in.
            </p>
            <p>
              Projects in Circuit Lab can be linked to hackathon submissions, documented in the knowledge hub, and shared with team members for collaborative hardware development.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="10" title="Jobs">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              The <strong>Jobs</strong> board connects platform members with internship and employment opportunities relevant to their skills. Listings are curated to ensure relevance to the university community and may include positions from university departments, partner organizations, and alumni networks.
            </p>
            <p>
              Your platform profile, including reputation score, completed challenges, hackathon participation, and project portfolio, serves as a living resume that potential employers can review.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="Community" title="Community & Events">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-6">
            <p>
              The community layer ties everything together. Chapters provide organizational structure, events bring people together, and workshops offer hands-on learning experiences.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="11" title="Chapters">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              <strong>Chapters</strong> are the organizational units of the VeritaBox community. Each chapter represents a team, interest group, or community within the platform. Members belong to a chapter, and chapters can host their own events, maintain leaderboards, and track collective achievements.
            </p>
            <p>
              Chapter administrators manage member enrollment, coordinate events, and serve as the primary point of contact for platform governance within their group.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="12" title="Events">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              The <strong>Events</strong> module handles scheduling, registration, and communication for all platform activities, from small chapter meetups to large-scale university-wide competitions. Events can be linked to hackathons, competitions, or workshops for integrated management.
            </p>
            <p>
              Each event has a dedicated page with details, a registration form, attendee management, and post-event feedback collection. Administrators can send notifications to registered participants and track attendance.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="13" title="Workshops">
        <Reveal>
          <div className="leading-relaxed text-[15px] text-foreground/90 space-y-4">
            <p>
              <strong>Workshops</strong> are structured, instructor-led learning sessions that combine presentation with hands-on practice. Unlike self-paced tutorials, workshops are scheduled events with a defined agenda, materials, and interactive exercises.
            </p>
            <p>
              Workshop materials, recordings, and follow-up resources are archived on the platform so participants can revisit them later. Workshops can be linked to relevant tutorials and Code Forge challenges for continued practice after the session.
            </p>
          </div>
        </Reveal>
      </Section>

      <Reveal>
        <div className="leading-relaxed text-[15px] text-foreground/90 space-y-6 pt-4 border-t border-border/40">
          <p>
            Every module on VeritaBox is connected. Your Code Forge solves, hackathon wins, bounty completions, tutorial progress, and event participation all feed into a single reputation system that reflects your overall contribution to the community.
          </p>
          <p>
            The platform is under active development. For the current development status and upcoming features, check the <Link to="/about" className="text-primary hover:underline underline-offset-4 transition-colors">About page</Link> or reach out through our <Link to="/contact" className="text-primary hover:underline underline-offset-4 transition-colors">Contact page</Link>.
          </p>
        </div>
      </Reveal>
    </InfoPage>
  );
}
