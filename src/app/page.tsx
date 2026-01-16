import Link from "next/link";

function GeometricDecoration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Large triangle - top right */}
      <div
        className="absolute -top-20 -right-20 w-80 h-80 bg-secondary"
        style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
      />
      {/* Small triangle - bottom left */}
      <div
        className="absolute -bottom-10 -left-10 w-40 h-40 bg-foreground"
        style={{ clipPath: "polygon(0 100%, 0 0, 100% 100%)" }}
      />
      {/* Parallelogram - mid left */}
      <div
        className="absolute top-1/3 -left-16 w-32 h-20 bg-secondary opacity-60"
        style={{ clipPath: "polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)" }}
      />
    </div>
  );
}

function FeatureCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border border-border p-6 bg-background">
      <span className="font-mono text-secondary text-sm">{number}</span>
      <h3 className="text-xl font-bold mt-2 mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 md:px-12 lg:px-24">
        <GeometricDecoration />

        <div className="relative z-10 max-w-4xl">
          {/* Badge */}
          <div className="inline-block border border-border px-4 py-2 mb-8">
            <span className="font-mono text-sm tracking-wide">
              DEVELOPER ASSESSMENT
            </span>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-none mb-6">
            Practice a
            <br />
            <span className="text-secondary">Real Scenario</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-12">
            Experience a simulated day at work. HR interview, manager kickoff,
            coding task, and PR defense—all powered by AI.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/start"
              className="inline-block bg-foreground text-background px-8 py-4 text-lg font-semibold border-2 border-foreground hover:bg-secondary hover:text-secondary-foreground hover:border-secondary text-center"
            >
              Start Practicing
            </Link>
            <Link
              href="#how-it-works"
              className="inline-block bg-background text-foreground px-8 py-4 text-lg font-semibold border-2 border-foreground hover:bg-accent hover:border-foreground text-center"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-px h-16 bg-border" />
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="px-6 md:px-12 lg:px-24 py-24 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <span className="font-mono text-secondary text-sm tracking-wide">
              HOW IT WORKS
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4">
              A complete simulation
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              number="01"
              title="HR Interview"
              description="Start with a voice conversation. Discuss your experience and approach to problem-solving."
            />
            <FeatureCard
              number="02"
              title="Manager Kickoff"
              description="Get briefed on your task. Ask questions, clarify requirements, understand the codebase."
            />
            <FeatureCard
              number="03"
              title="Coding Task"
              description="Work on a real-world problem. Use AI tools, collaborate with virtual coworkers, ship code."
            />
            <FeatureCard
              number="04"
              title="PR Defense"
              description="Present your work. Explain your decisions, handle feedback, and defend your implementation."
            />
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="px-6 md:px-12 lg:px-24 py-24 bg-foreground text-background">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            See how you really work
          </h2>
          <p className="text-xl text-background/70 mb-12 max-w-2xl mx-auto">
            Not just what you produce—but how you approach problems, communicate,
            leverage tools, and collaborate under realistic conditions.
          </p>
          <Link
            href="/start"
            className="inline-block bg-secondary text-secondary-foreground px-8 py-4 text-lg font-semibold border-2 border-secondary hover:bg-background hover:text-foreground hover:border-background"
          >
            Start Your Assessment
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 lg:px-24 py-12 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-bold text-2xl">Skillvee</div>
          <div className="font-mono text-sm text-muted-foreground">
            Built for developers who want to improve
          </div>
        </div>
      </footer>
    </main>
  );
}
