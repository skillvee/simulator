"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import {
  MessageSquare,
  FileCode,
  Video,
  Sparkles,
  Globe,
  Mail,
  Code2,
  Users,
  BarChart3,
  TrendingUp,
  DollarSign,
  HeartHandshake,
  FileText,
  Mic,
  Clock,
  Target,
  Zap,
  ArrowRight,
} from "lucide-react";

const content = {
  en: {
    tagline: "Work simulations that show who can actually do the job",
    hero: {
      heading: "Watch them work. Then hire.",
      subtitle:
        "See exactly how candidates communicate, collaborate, and solve problems—before you make the offer. No more expensive hiring mistakes.",
    },
    pain: {
      label: "The problem",
      headline: "AI broke hiring — and your process hasn't caught up.",
      lede:
        "The filters you've used for 20 years all stopped working at the same time. None of this was a problem 12 months ago.",
      items: [
        {
          strong: "Resumes stopped telling you anything.",
          rest:
            "Every resume is AI-polished now — they all read the same. You can't tell who's actually qualified.",
        },
        {
          strong: "Interviews stopped measuring the candidate.",
          rest:
            "45% of candidates are running AI in a second window. You're grading their copilot, not them.",
        },
        {
          strong: "Take-homes stopped being proof of work.",
          rest:
            "You can't tell what the candidate wrote and what their AI wrote. Neither can anyone else.",
        },
      ],
    },
    solution: {
      label: "How Skillvee can help",
      title: "Watch a candidate do Day 1 of the job — before you hire them.",
      description:
        "Every candidate completes a 45-minute work simulation. They get an assignment from an AI manager explaining the task. They ask clarifying questions, collaborate with teammates, use the AI tools they'd use on the job, submit their work and defend their decisions in a final debrief. Screen recorded end-to-end.",
      items: [
        {
          title: "Standardized scorecard",
          desc:
            "Communication, problem-solving, AI leverage, quality of output, collaboration.",
        },
        {
          title: "Full recording + transcripts",
          desc:
            "Skim a 45-minute session in 5 minutes. Jump to the moments that matter.",
        },
        {
          title: "Side-by-side comparison",
          desc: "Same task, same rubric, across every candidate in your pipeline.",
        },
      ],
    },
    roles: {
      label: "Works for every role you hire",
      intro: "Custom simulations tailored to the specific job you're hiring for.",
      items: {
        eng: {
          title: "Software Engineers",
          desc: "Build features, review code, collaborate with stakeholders.",
        },
        pm: {
          title: "Product Managers",
          desc: "Prioritize backlogs, run meetings, present roadmaps.",
        },
        ds: {
          title: "Data Scientists",
          desc: "Analyze data, communicate findings, make recommendations.",
        },
        program: {
          title: "Program Managers",
          desc: "Coordinate teams, resolve conflicts, drive alignment.",
        },
        sales: {
          title: "Sales",
          desc: "Run discovery calls, handle objections, close deals.",
        },
        cs: {
          title: "Customer Success",
          desc: "Onboard clients, handle escalations, drive renewals.",
        },
      },
    },
    benefits: {
      label: "Why hiring managers get excited",
      items: [
        {
          hook: "Skip 80% of weak candidates.",
          title: "Get your team's hours back",
          desc:
            "Screen candidates before anyone on your team meets them. Senior managers stop burning a day a week on interview loops.",
        },
        {
          hook: "Evidence, not gut feel.",
          title: "Better hires, fewer surprises",
          desc:
            "You've already seen them gather requirements, solve problems, and ship. The 'great interview, bad hire' pattern stops happening.",
        },
        {
          hook: "Days, not weeks.",
          title: "Shorter time-to-hire",
          desc:
            "Front-load real-work signal and cut interview rounds in half. Stop losing top candidates to 6-week processes.",
        },
      ],
    },
    faq: {
      label: "Frequently asked questions",
      items: [
        {
          q: "What if candidates just use AI to do everything?",
          a:
            "Good — so do your employees. We measure how they use AI, not whether. Prompting skill, judgment on outputs, and knowing when to override the model are the exact signals you want for 2026 hiring.",
        },
        {
          q: "How is this different from HackerRank / CodeSignal / Codility?",
          a:
            "They test algorithm puzzles in sandboxed IDEs and ban AI. We simulate the actual job — requirements gathering, stakeholder conversations, AI-assisted work, final defense. Different question, different answer.",
        },
        {
          q: "Will candidates actually complete a 45-minute simulation?",
          a:
            "It's async and on their schedule. Completion rates beat take-homes because it's engaging, realistic, and — unlike a take-home — finite. Candidates know exactly what they're signing up for.",
        },
      ],
      seeAll: "See complete FAQ",
    },
    cta: {
      label: "See it for yourself",
      heading:
        "Watch a real candidate session and walk through the scorecard with us.",
      description:
        "20 minutes. We'll show you a real candidate replay end-to-end, the scorecard and rubric, and how teams like yours are using it in their current pipeline.",
      button: "Book a 20-min demo",
      mailSubject: "Skillvee demo request",
    },
    footer: {
      left: "Skillvee · german@skillvee.com · www.skillvee.com",
      right: "Hiring for engineering, data, or product roles",
    },
  },
  es: {
    tagline:
      "Simulaciones de trabajo que muestran quién realmente puede hacer el trabajo",
    hero: {
      heading: "Míralos trabajar. Después contrata.",
      subtitle:
        "Ve exactamente cómo los candidatos se comunican, colaboran y resuelven problemas—antes de hacer la oferta. Se acabaron los errores costosos de contratación.",
    },
    pain: {
      label: "El problema",
      headline: "La IA rompió la contratación — y tu proceso no se ha adaptado.",
      lede:
        "Los filtros que has usado durante 20 años dejaron de funcionar al mismo tiempo. Nada de esto era un problema hace 12 meses.",
      items: [
        {
          strong: "Los currículums dejaron de decirte algo.",
          rest:
            "Todos los currículums están pulidos por IA — todos se leen igual. No puedes saber quién está realmente calificado.",
        },
        {
          strong: "Las entrevistas dejaron de medir al candidato.",
          rest:
            "El 45% de los candidatos usa IA en otra ventana. Estás evaluando a su copiloto, no a ellos.",
        },
        {
          strong: "Los take-homes dejaron de ser prueba de trabajo.",
          rest:
            "No puedes distinguir qué escribió el candidato y qué escribió su IA. Nadie puede.",
        },
      ],
    },
    solution: {
      label: "Cómo puede ayudarte Skillvee",
      title: "Ve al candidato hacer el Día 1 del trabajo — antes de contratarlo.",
      description:
        "Cada candidato completa una simulación de trabajo de 45 minutos. Recibe una tarea de un manager con IA. Hace preguntas de clarificación, colabora con el equipo, usa las herramientas de IA que usaría en el trabajo, entrega su trabajo y defiende sus decisiones en un debrief final. Grabación de pantalla de principio a fin.",
      items: [
        {
          title: "Scorecard estandarizado",
          desc:
            "Comunicación, resolución de problemas, uso de IA, calidad del output, colaboración.",
        },
        {
          title: "Grabación completa + transcripciones",
          desc:
            "Revisa una sesión de 45 minutos en 5. Salta a los momentos que importan.",
        },
        {
          title: "Comparación lado a lado",
          desc:
            "Misma tarea, mismo rubro, entre todos los candidatos de tu pipeline.",
        },
      ],
    },
    roles: {
      label: "Funciona para cada rol que contrates",
      intro:
        "Simulaciones personalizadas al trabajo específico que estás contratando.",
      items: {
        eng: {
          title: "Ingenieros de Software",
          desc: "Construir features, revisar código, colaborar con stakeholders.",
        },
        pm: {
          title: "Product Managers",
          desc: "Priorizar backlogs, dirigir reuniones, presentar roadmaps.",
        },
        ds: {
          title: "Data Scientists",
          desc: "Analizar datos, comunicar hallazgos, dar recomendaciones.",
        },
        program: {
          title: "Program Managers",
          desc: "Coordinar equipos, resolver conflictos, lograr alineación.",
        },
        sales: {
          title: "Ventas",
          desc: "Hacer discovery calls, manejar objeciones, cerrar negocios.",
        },
        cs: {
          title: "Customer Success",
          desc: "Onboardear clientes, manejar escalaciones, impulsar renovaciones.",
        },
      },
    },
    benefits: {
      label: "Por qué los hiring managers se emocionan",
      items: [
        {
          hook: "Salta el 80% de candidatos débiles.",
          title: "Recupera las horas de tu equipo",
          desc:
            "Filtra candidatos antes de que alguien de tu equipo los conozca. Los managers senior dejan de quemar un día a la semana en loops de entrevistas.",
        },
        {
          hook: "Evidencia, no intuición.",
          title: "Mejores contrataciones, menos sorpresas",
          desc:
            "Ya los has visto recopilar requisitos, resolver problemas y entregar. El patrón de 'gran entrevista, mala contratación' deja de pasar.",
        },
        {
          hook: "Días, no semanas.",
          title: "Menor tiempo de contratación",
          desc:
            "Adelanta la señal de trabajo real y corta las rondas de entrevistas a la mitad. Deja de perder a los mejores candidatos en procesos de 6 semanas.",
        },
      ],
    },
    faq: {
      label: "Preguntas frecuentes",
      items: [
        {
          q: "¿Qué pasa si los candidatos usan IA para hacer todo?",
          a:
            "Bien — igual que tus empleados. Medimos cómo usan la IA, no si la usan. Habilidad de prompting, juicio sobre outputs, y saber cuándo sobreescribir al modelo son exactamente las señales que quieres para contratar en 2026.",
        },
        {
          q: "¿En qué se diferencia de HackerRank / CodeSignal / Codility?",
          a:
            "Ellos prueban puzzles de algoritmos en IDEs aislados y prohíben la IA. Nosotros simulamos el trabajo real — recopilación de requisitos, conversaciones con stakeholders, trabajo asistido por IA, defensa final. Pregunta distinta, respuesta distinta.",
        },
        {
          q: "¿Los candidatos realmente van a completar una simulación de 45 minutos?",
          a:
            "Es asíncrona y en su propio horario. La tasa de completitud supera a los take-homes porque es atractiva, realista y — a diferencia de un take-home — finita. Los candidatos saben exactamente en qué se están metiendo.",
        },
      ],
      seeAll: "Ver FAQ completo",
    },
    cta: {
      label: "Velo por ti mismo",
      heading:
        "Mira una sesión real con un candidato y repasemos el scorecard juntos.",
      description:
        "20 minutos. Te mostraremos el replay real de un candidato de principio a fin, el scorecard y el rubro, y cómo equipos como el tuyo lo están usando en su pipeline actual.",
      button: "Reserva un demo de 20 min",
      mailSubject: "Solicitud de demo de Skillvee",
    },
    footer: {
      left: "Skillvee · german@skillvee.com · www.skillvee.com",
      right: "Contratando para roles de ingeniería, data o producto",
    },
  },
} as const;

type Locale = keyof typeof content;

export default function HiringManagerBrochurePage() {
  const locale = useLocale();
  const c = content[locale as Locale] ?? content.en;
  const painIcons = [FileText, Mic, Code2];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div
        className="br-container"
        style={{ maxWidth: 960, margin: "0 auto", padding: "48px 32px" }}
      >
        {/* ── HEADER ── */}
        <header
          className="br-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 24,
            marginBottom: 40,
            borderBottom: "3px solid #237CF1",
            gap: 16,
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}
          >
            <Image
              src="/skillvee-logo.png"
              alt="SkillVee"
              width={747}
              height={226}
              style={{ width: 180, height: "auto", maxWidth: "100%" }}
            />
            <p
              className="br-tagline"
              style={{
                fontSize: 16,
                color: "#475569",
                fontWeight: 600,
                margin: 0,
              }}
            >
              {c.tagline}
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#94a3b8",
              flexShrink: 0,
            }}
          >
            <Globe size={14} />
            <span>www.skillvee.com</span>
          </div>
        </header>

        {/* ── HERO ── */}
        <div style={{ marginBottom: 48 }}>
          <h1
            className="br-hero"
            style={{
              fontSize: 40,
              fontWeight: 900,
              color: "#0f172a",
              margin: "0 0 16px",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            {c.hero.heading}
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "#475569",
              margin: 0,
              lineHeight: 1.6,
              maxWidth: 720,
            }}
          >
            {c.hero.subtitle}
          </p>
        </div>

        {/* ── THE PAIN ── */}
        <div style={{ marginBottom: 56 }}>
          <SectionLabel>{c.pain.label}</SectionLabel>
          <h2
            className="br-pain-headline"
            style={{
              fontSize: 36,
              fontWeight: 900,
              color: "#0f172a",
              margin: "0 0 14px",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            {c.pain.headline}
          </h2>
          <p
            className="br-pain-lede"
            style={{
              fontSize: 15,
              color: "#475569",
              margin: "0 0 8px",
              lineHeight: 1.6,
            }}
          >
            {c.pain.lede}
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              marginTop: 16,
            }}
          >
            {c.pain.items.map((item, i) => {
              const Icon = painIcons[i];
              return (
                <PainLine key={i} icon={<Icon size={18} color="#ef4444" />}>
                  <strong style={{ fontWeight: 800 }}>{item.strong}</strong>{" "}
                  <span style={{ fontWeight: 400, color: "#475569" }}>
                    {item.rest}
                  </span>
                </PainLine>
              );
            })}
          </div>
        </div>

        {/* ── SOLUTION ── */}
        <div
          className="br-panel"
          style={{
            background: "rgba(35, 124, 241, 0.04)",
            border: "1px solid rgba(35, 124, 241, 0.2)",
            borderRadius: 12,
            padding: "28px 32px",
            marginBottom: 40,
          }}
        >
          <SectionLabel>{c.solution.label}</SectionLabel>
          <h3
            className="br-headline"
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: "#0f172a",
              margin: "0 0 12px",
            }}
          >
            {c.solution.title}
          </h3>
          <p style={{ fontSize: 14, color: "#475569", margin: "0 0 20px", lineHeight: 1.6 }}>
            {c.solution.description}
          </p>
          <div
            className="br-grid-3"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
            }}
          >
            <SolutionItem
              icon={<FileCode size={16} color="#237CF1" />}
              title={c.solution.items[0].title}
              desc={c.solution.items[0].desc}
            />
            <SolutionItem
              icon={<Video size={16} color="#237CF1" />}
              title={c.solution.items[1].title}
              desc={c.solution.items[1].desc}
            />
            <SolutionItem
              icon={<MessageSquare size={16} color="#237CF1" />}
              title={c.solution.items[2].title}
              desc={c.solution.items[2].desc}
            />
          </div>
        </div>

        {/* ── ROLES ── */}
        <div style={{ marginBottom: 48 }}>
          <SectionLabel>{c.roles.label}</SectionLabel>
          <p
            style={{
              fontSize: 14,
              color: "#475569",
              margin: "0 0 20px",
              lineHeight: 1.6,
            }}
          >
            {c.roles.intro}
          </p>
          <div
            className="br-roles-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 14,
            }}
          >
            <RoleCard
              icon={<Code2 size={18} color="#237CF1" />}
              iconBg="rgba(35, 124, 241, 0.12)"
              title={c.roles.items.eng.title}
              desc={c.roles.items.eng.desc}
            />
            <RoleCard
              icon={<Users size={18} color="#a855f7" />}
              iconBg="rgba(168, 85, 247, 0.12)"
              title={c.roles.items.pm.title}
              desc={c.roles.items.pm.desc}
            />
            <RoleCard
              icon={<BarChart3 size={18} color="#22c55e" />}
              iconBg="rgba(34, 197, 94, 0.12)"
              title={c.roles.items.ds.title}
              desc={c.roles.items.ds.desc}
            />
            <RoleCard
              icon={<TrendingUp size={18} color="#f59e0b" />}
              iconBg="rgba(245, 158, 11, 0.15)"
              title={c.roles.items.program.title}
              desc={c.roles.items.program.desc}
            />
            <RoleCard
              icon={<DollarSign size={18} color="#f43f5e" />}
              iconBg="rgba(244, 63, 94, 0.12)"
              title={c.roles.items.sales.title}
              desc={c.roles.items.sales.desc}
            />
            <RoleCard
              icon={<HeartHandshake size={18} color="#06b6d4" />}
              iconBg="rgba(6, 182, 212, 0.12)"
              title={c.roles.items.cs.title}
              desc={c.roles.items.cs.desc}
            />
          </div>
        </div>

        {/* ── WHY EXCITED ── */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
            }}
          >
            <Sparkles size={18} color="#237CF1" />
            <SectionLabel style={{ marginBottom: 0 }}>
              {c.benefits.label}
            </SectionLabel>
          </div>
          <div
            className="br-benefits-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
            }}
          >
            <BenefitHero
              icon={<Clock size={22} color="#237CF1" />}
              hook={c.benefits.items[0].hook}
              title={c.benefits.items[0].title}
              desc={c.benefits.items[0].desc}
            />
            <BenefitHero
              icon={<Target size={22} color="#237CF1" />}
              hook={c.benefits.items[1].hook}
              title={c.benefits.items[1].title}
              desc={c.benefits.items[1].desc}
            />
            <BenefitHero
              icon={<Zap size={22} color="#237CF1" />}
              hook={c.benefits.items[2].hook}
              title={c.benefits.items[2].title}
              desc={c.benefits.items[2].desc}
            />
          </div>
        </div>

        {/* ── FAQ ── */}
        <div style={{ marginBottom: 40 }}>
          <SectionLabel>{c.faq.label}</SectionLabel>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              marginTop: 16,
            }}
          >
            {c.faq.items.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
          <a
            href={`/${locale}/faq`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 18,
              marginLeft: 19,
              fontSize: 13,
              fontWeight: 700,
              color: "#237CF1",
              textDecoration: "none",
            }}
          >
            {c.faq.seeAll}
            <ArrowRight size={14} />
          </a>
        </div>

        {/* ── CTA ── */}
        <div
          className="br-cta"
          style={{
            background: "linear-gradient(135deg, #237CF1 0%, #1e6fd9 100%)",
            borderRadius: 16,
            padding: "36px 40px",
            color: "#ffffff",
            marginBottom: 32,
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.8)",
              margin: "0 0 10px",
            }}
          >
            {c.cta.label}
          </p>
          <h3
            className="br-cta-headline"
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: "#ffffff",
              margin: "0 0 10px",
              lineHeight: 1.3,
            }}
          >
            {c.cta.heading}
          </h3>
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.9)",
              margin: "0 0 20px",
              lineHeight: 1.6,
            }}
          >
            {c.cta.description}
          </p>
          <a
            href={`mailto:german@skillvee.com?subject=${encodeURIComponent(c.cta.mailSubject)}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#ffffff",
              color: "#237CF1",
              fontSize: 15,
              fontWeight: 700,
              padding: "12px 22px",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            <Mail size={16} />
            {c.cta.button}
          </a>
        </div>

        {/* ── FOOTER ── */}
        <footer
          className="br-footer"
          style={{
            borderTop: "3px solid #237CF1",
            paddingTop: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: "#64748b",
              margin: 0,
            }}
          >
            {c.footer.left}
          </p>
          <p
            style={{
              fontSize: 12,
              color: "#94a3b8",
              margin: 0,
            }}
          >
            {c.footer.right}
          </p>
        </footer>
      </div>

      {/* ── Mobile responsive overrides ── */}
      <style jsx>{`
        @media (max-width: 640px) {
          .br-container {
            padding: 24px 16px !important;
          }
          .br-container > * {
            margin-bottom: 32px !important;
          }
          .br-container > footer {
            margin-bottom: 0 !important;
          }
          .br-header {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .br-tagline {
            font-size: 13px !important;
            font-weight: 500 !important;
          }
          .br-hero {
            font-size: 24px !important;
          }
          .br-pain-headline {
            font-size: 24px !important;
          }
          .br-grid-2 {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .br-roles-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .br-benefits-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .br-grid-3 {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
          .br-headline {
            font-size: 18px !important;
          }
          .br-panel {
            padding: 22px 20px !important;
          }
          .br-cta {
            padding: 28px 22px !important;
          }
          .br-cta-headline {
            font-size: 20px !important;
          }
          .br-footer {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 6px !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ── Helper components ── */

function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <h2
      style={{
        fontSize: 13,
        fontWeight: 900,
        textTransform: "uppercase",
        letterSpacing: "0.2em",
        color: "#237CF1",
        marginBottom: 16,
        marginTop: 0,
        ...style,
      }}
    >
      {children}
    </h2>
  );
}

function RoleCard({
  icon,
  iconBg,
  title,
  desc,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  desc: string;
}) {
  return (
    <div
      style={{
        background: "#f8fafc",
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#0f172a",
            margin: "0 0 4px",
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontSize: 12.5,
            color: "#64748b",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}

function PainLine({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "16px 0",
        borderBottom: "1px solid #e2e8f0",
      }}
    >
      {icon ? (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(239, 68, 68, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          {icon}
        </div>
      ) : null}
      <p
        style={{
          fontSize: 16,
          fontWeight: 500,
          color: "#0f172a",
          margin: 0,
          lineHeight: 1.55,
          flex: 1,
        }}
      >
        {children}
      </p>
    </div>
  );
}

function SolutionItem({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "rgba(35, 124, 241, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>
          {title}
        </p>
        <p
          style={{
            fontSize: 12.5,
            color: "#64748b",
            margin: "2px 0 0",
            lineHeight: 1.5,
          }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}

function BenefitHero({
  icon,
  hook,
  title,
  desc,
}: {
  icon: React.ReactNode;
  hook: string;
  title: string;
  desc: string;
}) {
  return (
    <div
      style={{
        background:
          "linear-gradient(160deg, rgba(35, 124, 241, 0.07) 0%, rgba(35, 124, 241, 0.02) 100%)",
        border: "1px solid rgba(35, 124, 241, 0.2)",
        borderRadius: 14,
        padding: "22px 22px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 11,
          background: "rgba(35, 124, 241, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <p
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: "#237CF1",
          margin: 0,
          lineHeight: 1.25,
          letterSpacing: "-0.01em",
        }}
      >
        {hook}
      </p>
      <p
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#0f172a",
          margin: 0,
          lineHeight: 1.3,
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: 13,
          color: "#475569",
          margin: 0,
          lineHeight: 1.55,
        }}
      >
        {desc}
      </p>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <div
      style={{
        borderLeft: "3px solid rgba(35, 124, 241, 0.4)",
        paddingLeft: 16,
      }}
    >
      <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>
        {q}
      </p>
      <p style={{ fontSize: 13, color: "#475569", margin: 0, lineHeight: 1.6 }}>
        {a}
      </p>
    </div>
  );
}
