/**
 * Eval Scenarios — 15 test cases for simulation prompt quality
 *
 * Each scenario uses realistic mock data matching production structures.
 * Scenarios cover manager, non-manager, and edge-case interactions.
 */

import type { CoworkerPersona } from "@/types";
import type { EvalScenario } from "./types";

// ─── Realistic Mock Personas ─────────────────────────────────────────────────

const MANAGER_ELENA: CoworkerPersona = {
  name: "Elena Rodriguez",
  role: "Engineering Manager, Product Analytics",
  personaStyle: "Warm and direct. Elena is encouraging but doesn't waste words. She gives you space to figure things out but is always available when you need her. Prefers Slack for quick updates, calls for deeper discussions.",
  knowledge: [
    {
      topic: "notification_experiment",
      triggerKeywords: ["notification", "reels", "A/B test", "experiment", "push"],
      response: "We've been running a 'Reels Catch-up' notification A/B test for about a week. DAU is up 2% in the treatment group, but push-disable rate among 18-24 is spiking. We need to figure out if the long-term risk of notification fatigue outweighs the short-term engagement gains.",
      isCritical: true,
    },
    {
      topic: "team_process",
      triggerKeywords: ["process", "PR", "review", "deploy", "workflow"],
      response: "For code reviews, tag the senior on the team. Keep PRs focused. We deploy twice a day — morning and afternoon. If it's urgent, we can do a hotfix deploy.",
      isCritical: false,
    },
    {
      topic: "data_sources",
      triggerKeywords: ["data", "table", "database", "query", "dim_"],
      response: "Main tables are dim_notification_events for push triggers and fact_engagement for DAU metrics. There's a known logging bug on the latest Android version that might be skewing opt-out numbers — check with the data eng team about that.",
      isCritical: true,
    },
  ],
};

const PM_ARJUN: CoworkerPersona = {
  name: "Arjun Mehta",
  role: "Product Manager, Reels Engagement",
  personaStyle: "Enthusiastic and data-driven. Arjun loves metrics and user research. He's always excited about experiments and tends to think in terms of user stories. Can be a bit verbose when he's passionate about a topic.",
  knowledge: [
    {
      topic: "reels_metrics",
      triggerKeywords: ["metrics", "DAU", "engagement", "KPI", "success"],
      response: "For Reels, we track DAU, time spent, and content production rate. The north star is 'daily active Reels viewers' but we also watch creator-side metrics closely. Push-disable rate is a lagging indicator we've been worried about.",
      isCritical: true,
    },
    {
      topic: "notification_strategy",
      triggerKeywords: ["notification", "push", "strategy", "user sentiment"],
      response: "We weight user sentiment against active time when deciding notification frequency. The current model doesn't account for age cohort differences well — that's part of what this experiment is testing.",
      isCritical: true,
    },
    {
      topic: "experiment_design",
      triggerKeywords: ["experiment", "A/B", "test", "control", "treatment"],
      response: "The experiment has a 50/50 split with holdout. Treatment group gets the Reels Catch-up notification at 6pm daily. Control gets nothing. We're measuring 7-day retention as the primary metric.",
      isCritical: false,
    },
  ],
};

const ENGINEER_CHLOE: CoworkerPersona = {
  name: "Chloe Dubois",
  role: "Senior Data Engineer, Core Infrastructure",
  personaStyle: "Dry and efficient. Chloe doesn't do small talk at work. She'll answer your question precisely and move on. Appreciates when people come prepared with specific questions rather than vague asks.",
  knowledge: [
    {
      topic: "dim_notification_events",
      triggerKeywords: ["dim_notification", "notification table", "events table", "logging"],
      response: "dim_notification_events has all push notification triggers. Schema: user_id, notification_type, sent_at, platform, version, action (opened/dismissed/disabled). Watch out — there's a logging bug on Android 14.2 where some dismiss events are being logged as disable events.",
      isCritical: true,
    },
    {
      topic: "data_pipeline",
      triggerKeywords: ["pipeline", "ETL", "data freshness", "latency", "batch"],
      response: "Pipeline runs hourly. Data lands in the warehouse about 45 minutes after the hour. If you need real-time, there's a streaming layer but it only has the last 24 hours. For experiment analysis, the batch data is what you want.",
      isCritical: false,
    },
    {
      topic: "dim_user_metadata",
      triggerKeywords: ["user metadata", "demographics", "age", "cohort", "segment"],
      response: "Join on dim_user_metadata for demographics. age_bucket field gives you the cohort (13-17, 18-24, 25-34, etc.). Make sure you're using the active_user flag — we have a lot of ghost accounts that'll skew your numbers.",
      isCritical: true,
    },
  ],
};

// ─── Realistic Task Description ──────────────────────────────────────────────

const TASK_DESCRIPTION = `Hey! So we've been running an A/B test on a new 'Reels Catch-up' notification for about a week now. The initial data shows a 2% lift in Reels DAU, which looks great on paper, but the push-disable rate among the 18-24 cohort is looking a bit scary. We need you to dig into the results and tell us if we should actually roll this out or if the long-term risk of notification fatigue outweighs the short-term gains. You'll need to look at more than just the primary metric — check the retention proxy for the treatment group vs. control. I'd suggest chatting with the PM for Reels Engagement about how we're currently weighting 'user sentiment' against 'active time.' Also, heads up: ask the Data Eng team about the dim_notification_events table; I heard there was a logging bug on the latest Android version that might be skewing the opt-out numbers for that group.`;

const COMPANY = "Meta";
const TECH_STACK = ["SQL", "Python", "R"];
const CANDIDATE = "Test User";
const REPO_URL = "https://github.com/skillvee/assessment-test123";

// ─── Scenarios ───────────────────────────────────────────────────────────────

// ─── Spanish Mock Personas ──────────────────────────────────────────────────

const MANAGER_ELENA_ES: CoworkerPersona = {
  name: "Elena Rodriguez",
  role: "Gerente de Ingeniería, Análisis de Producto",
  personaStyle: "Cálida y directa. Elena es alentadora pero no pierde palabras. Te da espacio para resolver las cosas por tu cuenta pero siempre está disponible cuando la necesitas. Prefiere Slack para actualizaciones rápidas, llamadas para discusiones más profundas.",
  knowledge: [
    {
      topic: "experimento_notificaciones",
      triggerKeywords: ["notificación", "reels", "prueba A/B", "experimento", "push"],
      response: "Hemos estado ejecutando una prueba A/B de notificación 'Ponte al día con Reels' durante aproximadamente una semana. DAU está arriba 2% en el grupo de tratamiento, pero la tasa de deshabilitación de push entre 18-24 está aumentando. Necesitamos averiguar si el riesgo a largo plazo de fatiga de notificaciones supera las ganancias de engagement a corto plazo.",
      isCritical: true,
    },
    {
      topic: "proceso_equipo",
      triggerKeywords: ["proceso", "PR", "revisión", "desplegar", "flujo de trabajo"],
      response: "Para revisiones de código, etiqueta al senior del equipo. Mantén los PRs enfocados. Desplegamos dos veces al día — mañana y tarde. Si es urgente, podemos hacer un despliegue de hotfix.",
      isCritical: false,
    },
    {
      topic: "fuentes_datos",
      triggerKeywords: ["datos", "tabla", "base de datos", "consulta", "dim_"],
      response: "Las tablas principales son dim_notification_events para los disparadores de push y fact_engagement para métricas DAU. Hay un bug conocido de logging en la última versión de Android que podría estar sesgando los números de opt-out — consulta con el equipo de data eng sobre eso.",
      isCritical: true,
    },
  ],
};

const PM_ARJUN_ES: CoworkerPersona = {
  name: "Arjun Mehta",
  role: "Gerente de Producto, Engagement de Reels",
  personaStyle: "Entusiasta y orientado a datos. A Arjun le encantan las métricas y la investigación de usuarios. Siempre está emocionado por los experimentos y tiende a pensar en términos de historias de usuario. Puede ser un poco verboso cuando le apasiona un tema.",
  knowledge: [
    {
      topic: "metricas_reels",
      triggerKeywords: ["métricas", "DAU", "engagement", "KPI", "éxito"],
      response: "Para Reels, rastreamos DAU, tiempo invertido, y tasa de producción de contenido. La estrella del norte es 'espectadores activos diarios de Reels' pero también vigilamos de cerca las métricas del lado del creador. La tasa de deshabilitación de push es un indicador retrasado del que hemos estado preocupados.",
      isCritical: true,
    },
    {
      topic: "estrategia_notificaciones",
      triggerKeywords: ["notificación", "push", "estrategia", "sentimiento del usuario"],
      response: "Ponderamos el sentimiento del usuario contra el tiempo activo al decidir la frecuencia de notificaciones. El modelo actual no tiene en cuenta bien las diferencias de cohorte de edad — eso es parte de lo que está probando este experimento.",
      isCritical: true,
    },
    {
      topic: "diseño_experimento",
      triggerKeywords: ["experimento", "A/B", "prueba", "control", "tratamiento"],
      response: "El experimento tiene una división 50/50 con holdout. El grupo de tratamiento recibe la notificación de Ponte al día con Reels a las 6pm diariamente. El control no recibe nada. Estamos midiendo la retención de 7 días como la métrica principal.",
      isCritical: false,
    },
  ],
};

const ENGINEER_CHLOE_ES: CoworkerPersona = {
  name: "Chloe Dubois",
  role: "Ingeniera Senior de Datos, Infraestructura Central",
  personaStyle: "Seca y eficiente. Chloe no hace conversación casual en el trabajo. Responderá tu pregunta con precisión y seguirá adelante. Aprecia cuando las personas vienen preparadas con preguntas específicas en lugar de solicitudes vagas.",
  knowledge: [
    {
      topic: "dim_notification_events",
      triggerKeywords: ["dim_notification", "tabla notificaciones", "tabla eventos", "logging"],
      response: "dim_notification_events tiene todos los disparadores de notificaciones push. Esquema: user_id, notification_type, sent_at, platform, version, action (opened/dismissed/disabled). Cuidado — hay un bug de logging en Android 14.2 donde algunos eventos de dismiss se están registrando como eventos de disable.",
      isCritical: true,
    },
    {
      topic: "pipeline_datos",
      triggerKeywords: ["pipeline", "ETL", "frescura de datos", "latencia", "batch"],
      response: "El pipeline se ejecuta cada hora. Los datos llegan al warehouse aproximadamente 45 minutos después de la hora. Si necesitas tiempo real, hay una capa de streaming pero solo tiene las últimas 24 horas. Para análisis de experimentos, los datos batch son lo que quieres.",
      isCritical: false,
    },
    {
      topic: "dim_user_metadata",
      triggerKeywords: ["metadatos usuario", "demografía", "edad", "cohorte", "segmento"],
      response: "Une con dim_user_metadata para demografía. El campo age_bucket te da la cohorte (13-17, 18-24, 25-34, etc.). Asegúrate de usar la bandera active_user — tenemos muchas cuentas fantasma que sesgarán tus números.",
      isCritical: true,
    },
  ],
};

const TASK_DESCRIPTION_ES = `¡Hola! Entonces, hemos estado ejecutando una prueba A/B en una nueva notificación 'Ponte al día con Reels' durante aproximadamente una semana. Los datos iniciales muestran un aumento del 2% en Reels DAU, lo cual se ve genial en papel, pero la tasa de deshabilitación de push entre la cohorte de 18-24 está empezando a verse un poco preocupante. Necesitamos que profundices en los resultados y nos digas si realmente deberíamos implementar esto o si el riesgo a largo plazo de fatiga de notificaciones supera las ganancias a corto plazo. Necesitarás mirar más que solo la métrica principal — revisa el proxy de retención para el grupo de tratamiento vs. control. Te sugiero que hables con el PM de Engagement de Reels sobre cómo estamos ponderando actualmente 'sentimiento del usuario' contra 'tiempo activo'. También, heads up: pregunta al equipo de Data Eng sobre la tabla dim_notification_events; escuché que había un bug de logging en la última versión de Android que podría estar sesgando los números de opt-out para ese grupo.`;

export const EVAL_SCENARIOS: EvalScenario[] = [
  // ── Manager Scenarios (6) ──────────────────────────────────────────────────

  {
    id: "manager-initial-greeting",
    name: "Manager Initial Greeting",
    category: "manager",
    agent: MANAGER_ELENA,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "",
    phase: "initial_greeting",
    media: "chat",
    userMessage: "[Generate your first message to the candidate]",
    criteria: "Should be a warm, casual welcome (1-2 sentences). Must NOT mention the task, experiment, or any work details. Just a friendly hello asking how they're settling in.",
  },

  {
    id: "manager-first-briefing",
    name: "Manager First Briefing",
    category: "manager",
    agent: MANAGER_ELENA,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION,
    candidateName: CANDIDATE,
    conversationHistory: `## Conversation History
You: Hey! Welcome to the team! How's it going — got everything set up ok?
Candidate: Hey Elena! All good, just getting set up. What should I be working on?`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "Hey Elena! All good, just getting set up. What should I be working on?",
    criteria: "Should share the task naturally and conversationally — the business problem, not a formal briefing. Should mention the repo. Should NOT dump everything at once. Should tell them to review and call when ready. 2-3 short Slack messages, not an essay.",
  },

  {
    id: "manager-overwhelmed-user",
    name: "Manager with Overwhelmed User",
    category: "manager",
    agent: MANAGER_ELENA,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION,
    candidateName: CANDIDATE,
    conversationHistory: `## Conversation History
You: Hey! Welcome to the team! How's it going — got everything set up ok?
Candidate: Hey... honestly a little overwhelmed. There's so much to take in.`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "Hey... honestly a little overwhelmed. There's so much to take in.",
    criteria: "Should be empathetic and reassuring FIRST ('totally normal', 'don't worry'). Should NOT immediately dump task details. Should ease into the work gently. Emotional intelligence matters here.",
  },

  {
    id: "manager-after-voice-call",
    name: "Manager After Voice Call",
    category: "manager",
    agent: MANAGER_ELENA,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION,
    candidateName: CANDIDATE,
    conversationHistory: `## Conversation History
You: Hey! Welcome to the team! How's it going — got everything set up ok?
Candidate: Hey! All good, can we hop on a call to discuss?
You: Sure, calling you now!
[Voice call transcript]
You: Hey! So the main thing is we have this Reels notification experiment running...
Candidate: Got it, so I need to look at the retention data?
You: Exactly. Check the dim_notification_events table and the repo has the initial analysis.
Candidate: Sounds good, I'll dive in.
[End of voice call]`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "Just got off the call, going to start looking at the data now",
    criteria: "Should reference the call naturally ('as we discussed'). Should share the repo link. Should NOT re-explain everything from the call. Brief follow-up only — they already know the context.",
  },

  {
    id: "manager-vague-question",
    name: "Manager Vague Question",
    category: "manager",
    agent: MANAGER_ELENA,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION,
    candidateName: CANDIDATE,
    conversationHistory: `## Conversation History
You: Hey! Welcome aboard! Here's the deal — we have a Reels notification experiment with mixed results. Check the repo: ${REPO_URL}
Candidate: Thanks! I'll take a look.`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "Can you tell me everything about the project?",
    criteria: "Should NOT info-dump. Should ask a clarifying question like 'what part are you curious about?' or 'what specifically do you want to know?'. Vague questions should be met with clarifying questions, not essays.",
  },

  {
    id: "manager-defense-call",
    name: "Manager Defense Call Opening",
    category: "manager",
    agent: MANAGER_ELENA,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION,
    candidateName: CANDIDATE,
    conversationHistory: `## Conversation History
[Several chat messages about the task]
You: Great, send me the PR when you're done!
Candidate: Here's my PR: https://github.com/skillvee/assessment-test123/pull/1
You: Got it! Let's hop on a call to walk through it.`,
    crossAgentContext: "",
    phase: "defense",
    phaseContext: `## PR Defense Review
Task: ${TASK_DESCRIPTION}
Tech stack: ${TECH_STACK.join(", ")}
Repo: ${REPO_URL}
PR: https://github.com/skillvee/assessment-test123/pull/1

## How to Run This Call
Follow these 5 phases in order:
Phase 1 — Opening (2 min): Ask them to walk you through what they did.
Phase 2 — High-level (3-4 min): Overall approach, architecture decisions.
Phase 3 — Technical probes (5-7 min): At least 3 specific questions about their code.
Phase 4 — Process (2-3 min): What was hardest, AI tool usage.
Phase 5 — Wrap up (1-2 min): Thank them.`,
    media: "voice",
    userMessage: "[call connected]",
    criteria: "Should open with a natural greeting and ask them to walk through their PR. Should NOT say 'no problem at all' or respond as if the user said something. Should sound like picking up a phone call naturally.",
  },

  // ── Non-Manager Scenarios (6) ──────────────────────────────────────────────

  {
    id: "nonmanager-casual-hello",
    name: "Non-Manager Casual Hello",
    category: "non-manager",
    agent: PM_ARJUN,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "Hey Arjun! Just started today, nice to meet you",
    criteria: "Should say hi back casually. Must NOT mention the task, experiment, metrics, or any work details. Must NOT act like the manager or brief them on what to do. Just a friendly hello.",
  },

  {
    id: "nonmanager-specific-question",
    name: "Non-Manager Specific Question",
    category: "non-manager",
    agent: ENGINEER_CHLOE,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: `## Conversation History
Candidate: Hey Chloe!
You: Hey.`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "I need to look at notification event data. What table should I query?",
    criteria: "Should share relevant technical knowledge about dim_notification_events. Should be concise and technical. Should mention the Android logging bug if relevant. Should NOT dump everything they know — just answer the specific question.",
  },

  {
    id: "nonmanager-vague-question",
    name: "Non-Manager Vague Question",
    category: "non-manager",
    agent: ENGINEER_CHLOE,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: `## Conversation History
Candidate: Hey Chloe!
You: Hey.`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "Can you tell me about the data infrastructure?",
    criteria: "Should ask for specifics — 'what part?' or 'what are you trying to do?'. Should NOT dump all knowledge about pipelines, tables, and infrastructure. Vague questions get clarifying questions back.",
  },

  {
    id: "nonmanager-cross-reference",
    name: "Non-Manager Cross-Reference",
    category: "non-manager",
    agent: ENGINEER_CHLOE,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: `## Conversation History
Candidate: Hey Chloe!
You: Hey. What's up?`,
    crossAgentContext: "\nThe candidate has also talked to: Elena Rodriguez. Don't assume you know what they discussed.",
    phase: "ongoing",
    media: "chat",
    userMessage: "Elena mentioned you'd know about the dim_notification_events table and some logging bug?",
    criteria: "Should acknowledge Elena naturally ('yeah, Elena's right' or 'oh she sent you my way?'). Should then share knowledge about the table and the Android logging bug. Should be helpful but concise.",
  },

  {
    id: "nonmanager-with-history",
    name: "Non-Manager With Prior History",
    category: "non-manager",
    agent: PM_ARJUN,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: `## Conversation History
Candidate: Hey Arjun!
You: Hey! Welcome to the team.
Candidate: Thanks! Elena told me about the Reels notification experiment. What metrics are you tracking?
You: For Reels, we track DAU, time spent, and content production rate. Push-disable rate is a lagging indicator we've been worried about.
Candidate: Makes sense. What about the experiment design?
You: 50/50 split with holdout. Treatment group gets the notification at 6pm daily.`,
    crossAgentContext: "\nThe candidate has also talked to: Elena Rodriguez. Don't assume you know what they discussed.",
    phase: "ongoing",
    media: "chat",
    userMessage: "One more question — how do you weight user sentiment vs active time?",
    criteria: "Should answer the specific question about sentiment weighting. Should NOT repeat information already shared (DAU, experiment design). Should add NEW information. Should reference prior context naturally if relevant.",
  },

  {
    id: "nonmanager-territorial",
    name: "Non-Manager Territorial Personality",
    category: "non-manager",
    agent: {
      ...ENGINEER_CHLOE,
      personaStyle: "Guarded and territorial about the data infrastructure. Chloe built most of it herself and is protective of her domain. She'll help but wants to know WHY you need access before sharing details. Stressed about an upcoming migration.",
    },
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: `## Conversation History
Candidate: Hey Chloe!
You: Hey.`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "I need access to the data warehouse. Can you set me up?",
    criteria: "Should be in character — guarded, wants to know WHY before granting access. Should ask what they need it for. Should NOT be overly helpful or welcoming. Personality should come through clearly.",
  },

  // ── Edge Cases (3) ─────────────────────────────────────────────────────────

  {
    id: "edge-long-history",
    name: "Very Long Conversation History",
    category: "edge-case",
    agent: PM_ARJUN,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: `## Conversation History
Candidate: Hey Arjun!
You: Hey! Welcome to the team.
Candidate: Thanks! What can you tell me about the Reels metrics?
You: We track DAU, time spent, and content production rate.
Candidate: What about the experiment?
You: 50/50 split, treatment gets notifications at 6pm.
Candidate: And the retention data?
You: 7-day retention is the primary metric.
Candidate: What about the 18-24 cohort?
You: Push-disable rate is concerning in that group.
Candidate: How does the notification frequency work?
You: We weight user sentiment against active time.
Candidate: Who designed the experiment?
You: The growth team set it up, I helped define the metrics.
Candidate: What tools do you use for analysis?
You: Mostly SQL and Python notebooks. The data team has some R dashboards too.
Candidate: Any concerns about the data quality?
You: There's a logging bug on Android that might affect opt-out numbers. Check with Chloe about that.
Candidate: Got it. What's the timeline for the decision?
You: We want to decide by end of next week.
Candidate: Ok, I'll focus on the retention analysis first.
You: Sounds like a solid plan.
Candidate: One more thing — where can I find the raw experiment data?
You: It's in the data warehouse. dim_notification_events has the notification triggers, fact_engagement has the DAU data.`,
    crossAgentContext: "\nThe candidate has also talked to: Elena Rodriguez, Chloe Dubois. Don't assume you know what they discussed.",
    phase: "ongoing",
    media: "chat",
    userMessage: "Hey, quick question — what was the primary metric again?",
    criteria: "Should answer concisely (7-day retention). Should NOT dump all previously shared information. Should recognize this was already discussed and answer directly without lengthy re-explanation. Coherence with long history is key.",
  },

  {
    id: "edge-nonexistent-wiki",
    name: "User Asks About Nonexistent Wiki",
    category: "edge-case",
    agent: ENGINEER_CHLOE,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: `## Conversation History
Candidate: Hey Chloe!
You: Hey.`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "Is there a wiki or documentation portal for the data infrastructure?",
    criteria: "Must NOT invent a wiki, Confluence, Notion, or any documentation portal. Should say something like 'not sure about docs, check the repo README' or 'I just look at the code'. Must NOT hallucinate resources that don't exist in their knowledge.",
  },

  {
    id: "edge-voice-greeting",
    name: "Voice Call Natural Greeting",
    category: "edge-case",
    agent: PM_ARJUN,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: `## Conversation History
Candidate: Hey Arjun! Can we hop on a quick call?
You: Sure, let's do it!`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "voice",
    userMessage: "[call connected]",
    criteria: "Should speak first with a natural greeting ('hey!', 'what's up?'). Must NOT say 'no problem at all' or respond as if the user said something. Must NOT dump task information. Should sound like answering a phone call.",
  },

  // ── Voice Multi-Turn Scenarios (8) ─────────────────────────────────────────

  {
    id: "voice-kickoff-nervous",
    name: "Voice: Manager Kickoff — Nervous Candidate",
    category: "voice",
    agent: MANAGER_ELENA,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "",
    phase: "ongoing",
    media: "voice",
    userMessage: "[call connected]",
    multiTurn: {
      candidatePersona: "You're a nervous new hire on your first day. You're polite but overwhelmed. You ask hesitant questions and sometimes say 'sorry' unnecessarily. You need reassurance before diving into work details.",
      coworkerSpeaksFirst: true,
      maxTurns: 6,
      scenarioContext: "First kickoff call with the engineering manager. Candidate has zero context about the task.",
    },
    criteria: "First message must be a natural greeting (NOT 'no problem at all' or responding to something unsaid). Should be empathetic with nervous candidate. Should explain the task gradually, not dump everything. Should check in: 'does that make sense?'. Conversation should flow naturally.",
  },

  {
    id: "voice-kickoff-confident",
    name: "Voice: Manager Kickoff — Confident Candidate",
    category: "voice",
    agent: MANAGER_ELENA,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "",
    phase: "ongoing",
    media: "voice",
    userMessage: "[call connected]",
    multiTurn: {
      candidatePersona: "You're an experienced data scientist who's confident but respectful. You ask pointed, specific questions about metrics and methodology. You push back if something doesn't make sense. You're efficient with words.",
      coworkerSpeaksFirst: true,
      maxTurns: 6,
      scenarioContext: "First kickoff call. Candidate is experienced and will ask sharp questions.",
    },
    criteria: "First message must be a natural greeting. Should adapt to confident candidate — be more direct, less hand-holding. Should handle specific questions well. Conversation should feel like two professionals talking, not a tutorial.",
  },

  {
    id: "voice-kickoff-vague",
    name: "Voice: Manager Kickoff — Vague Candidate",
    category: "voice",
    agent: MANAGER_ELENA,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "",
    phase: "ongoing",
    media: "voice",
    userMessage: "[call connected]",
    multiTurn: {
      candidatePersona: "You struggle to articulate what you need. You ask broad questions like 'so what's the deal with the project?' and 'how does everything work here?'. You need the manager to guide you to specifics.",
      coworkerSpeaksFirst: true,
      maxTurns: 6,
      scenarioContext: "First kickoff call. Candidate asks vague questions and needs guidance.",
    },
    criteria: "First message must be a natural greeting. Should guide vague candidate to specifics rather than dumping everything. Should ask clarifying questions. Should not monologue when candidate is vague.",
  },

  {
    id: "voice-engineer-technical",
    name: "Voice: Engineer Technical Call",
    category: "voice",
    agent: ENGINEER_CHLOE,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "\nThe candidate has also talked to: Elena Rodriguez. Don't assume you know what they discussed.",
    phase: "ongoing",
    media: "voice",
    userMessage: "[call connected]",
    multiTurn: {
      candidatePersona: "You're an experienced data scientist calling the data engineer for help with specific tables. You have pointed questions about dim_notification_events and data pipeline latency.",
      coworkerSpeaksFirst: true,
      maxTurns: 4,
      scenarioContext: "Quick technical call. Candidate has specific data questions.",
    },
    criteria: "First message must be a natural greeting. Should stay in data engineer domain. Should answer technical questions concisely. Should NOT explain the business problem or task — that's the manager's job. Short, focused call.",
  },

  {
    id: "voice-pm-quiet",
    name: "Voice: PM with Quiet Candidate",
    category: "voice",
    agent: PM_ARJUN,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "",
    phase: "ongoing",
    media: "voice",
    userMessage: "[call connected]",
    multiTurn: {
      candidatePersona: "You're introverted and prefer to listen. You give short responses ('ok', 'got it', 'makes sense'). You only ask a question when genuinely stuck. You need the coworker to check in on you.",
      coworkerSpeaksFirst: true,
      maxTurns: 6,
      scenarioContext: "Call with the PM. Candidate is quiet and the PM needs to draw them out.",
    },
    criteria: "First message must be a natural greeting. Should NOT monologue when candidate is quiet. Should check in and ask questions. Should not dump information when getting 'ok' responses. Should adapt to the quiet communication style.",
  },

  {
    id: "voice-defense-call",
    name: "Voice: Defense Call (Full)",
    category: "voice",
    agent: MANAGER_ELENA,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION,
    candidateName: CANDIDATE,
    conversationHistory: `## Conversation History
You: Hey! Welcome to the team!
Candidate: Thanks Elena!
You: We've been running a Reels notification A/B test. Check the repo: ${REPO_URL}
Candidate: Got it, I'll look into it.
Candidate: Here's my PR: https://github.com/skillvee/assessment-test123/pull/1
You: Great, let's hop on a call to discuss!`,
    crossAgentContext: "",
    phase: "defense",
    phaseContext: `## PR Defense Review
Task: ${TASK_DESCRIPTION}
Tech stack: ${TECH_STACK.join(", ")}
Repo: ${REPO_URL}
PR: https://github.com/skillvee/assessment-test123/pull/1

## How to Run This Call
Follow these 5 phases in order:
Phase 1 — Opening: Ask them to walk you through what they did.
Phase 2 — High-level: Overall approach, architecture decisions.
Phase 3 — Technical probes: At least 3 specific questions about their code.
Phase 4 — Process: What was hardest, AI tool usage.
Phase 5 — Wrap up: Thank them.`,
    media: "voice",
    userMessage: "[call connected]",
    multiTurn: {
      candidatePersona: "You're a confident data scientist who completed the analysis. You can explain your approach clearly: you analyzed the Reels notification experiment data, found the 18-24 cohort push-disable rate was concerning, built retention proxy comparisons, and recommended a targeted rollout excluding that cohort.",
      coworkerSpeaksFirst: true,
      maxTurns: 10,
      scenarioContext: "PR defense call. Manager reviews the candidate's analysis work.",
    },
    criteria: "First message must ask candidate to walk through their PR. Should follow the 5-phase structure. Should ask at least 2-3 specific questions. Should NOT just agree with everything — should probe and dig deeper. Conversation should feel like a real code review call.",
  },

  {
    id: "voice-cross-reference",
    name: "Voice: Cross-Reference Call",
    category: "voice",
    agent: ENGINEER_CHLOE,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "\nThe candidate has also talked to: Elena Rodriguez. Don't assume you know what they discussed.",
    phase: "ongoing",
    media: "voice",
    userMessage: "[call connected]",
    multiTurn: {
      candidatePersona: "You're a nervous new hire. Elena (your manager) told you to call Chloe about the dim_notification_events table and a logging bug. You mention Elena sent you.",
      coworkerSpeaksFirst: true,
      maxTurns: 4,
      scenarioContext: "Short call. Candidate was sent by their manager to ask about data.",
    },
    criteria: "First message must be a natural greeting. Should acknowledge Elena naturally when mentioned. Should share technical knowledge helpfully. Short focused call.",
  },

  {
    id: "voice-off-topic",
    name: "Voice: Off-Topic Handling",
    category: "voice",
    agent: PM_ARJUN,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "",
    phase: "ongoing",
    media: "voice",
    userMessage: "[call connected]",
    multiTurn: {
      candidatePersona: "You're friendly and chatty. You go off-topic a lot — asking about the office, team culture, lunch spots, weekend plans. Between off-topic comments, you occasionally ask a work question about Reels metrics.",
      coworkerSpeaksFirst: true,
      maxTurns: 6,
      scenarioContext: "Call with PM. Candidate is chatty and goes off-topic frequently.",
    },
    criteria: "First message must be a natural greeting. Should handle off-topic gracefully — can be friendly but should gently redirect to work. Should not dump information. Should feel like a natural conversation with someone who likes to chat.",
  },

  // ── Spanish Scenarios (15 chat) ────────────────────────────────────────────

  {
    id: "manager-initial-greeting-es",
    name: "Gerente Saludo Inicial",
    category: "manager",
    language: "es",
    agent: MANAGER_ELENA_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION_ES,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "",
    phase: "initial_greeting",
    media: "chat",
    userMessage: "[Genera tu primer mensaje al candidato]",
    criteria: "Debe ser una bienvenida cálida y casual (1-2 oraciones). NO debe mencionar la tarea, experimento o detalles de trabajo. Solo un saludo amigable preguntando cómo se está instalando.",
  },

  {
    id: "manager-first-briefing-es",
    name: "Gerente Primera Reunión",
    category: "manager",
    language: "es",
    agent: MANAGER_ELENA_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION_ES,
    candidateName: CANDIDATE,
    conversationHistory: `## Historial de Conversación
Tú: ¡Hola! ¡Bienvenido al equipo! ¿Cómo va todo — conseguiste configurar todo bien?
Candidato: ¡Hola Elena! Todo bien, solo configurándome. ¿En qué debería estar trabajando?`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "¡Hola Elena! Todo bien, solo configurándome. ¿En qué debería estar trabajando?",
    criteria: "Debe compartir la tarea de manera natural y conversacional — el problema de negocio, no una presentación formal. Debe mencionar el repositorio. NO debe volcar todo de una vez. Debe decirles que revisen y llamen cuando estén listos. 2-3 mensajes cortos de Slack, no un ensayo.",
  },

  {
    id: "manager-overwhelmed-user-es",
    name: "Gerente con Usuario Abrumado",
    category: "manager",
    language: "es",
    agent: MANAGER_ELENA_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION_ES,
    candidateName: CANDIDATE,
    conversationHistory: `## Historial de Conversación
Tú: ¡Hola! ¡Bienvenido al equipo! ¿Cómo va todo — conseguiste configurar todo bien?
Candidato: Hola... honestamente un poco abrumado. Hay mucho que asimilar.`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "Hola... honestamente un poco abrumado. Hay mucho que asimilar.",
    criteria: "Debe ser empático y tranquilizador PRIMERO ('totalmente normal', 'no te preocupes'). NO debe inmediatamente volcar detalles de la tarea. Debe facilitar el trabajo suavemente. La inteligencia emocional importa aquí.",
  },

  {
    id: "manager-after-voice-call-es",
    name: "Gerente Después de Llamada de Voz",
    category: "manager",
    language: "es",
    agent: MANAGER_ELENA_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION_ES,
    candidateName: CANDIDATE,
    conversationHistory: `## Historial de Conversación
Tú: ¡Hola! ¡Bienvenido al equipo! ¿Cómo va todo — conseguiste configurar todo bien?
Candidato: ¡Hola! Todo bien, ¿podemos hacer una llamada para discutir?
Tú: ¡Claro, te llamo ahora!
[Transcripción de llamada de voz]
Tú: ¡Hola! Entonces lo principal es que tenemos este experimento de notificación de Reels ejecutándose...
Candidato: Entendido, ¿así que necesito mirar los datos de retención?
Tú: Exactamente. Revisa la tabla dim_notification_events y el repo tiene el análisis inicial.
Candidato: Suena bien, me sumergir.
[Fin de la llamada de voz]`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "Acabo de salir de la llamada, voy a empezar a mirar los datos ahora",
    criteria: "Debe referenciar la llamada naturalmente ('como discutimos'). Debe compartir el enlace del repositorio. NO debe volver a explicar todo de la llamada. Solo seguimiento breve — ya conocen el contexto.",
  },

  {
    id: "manager-vague-question-es",
    name: "Gerente Pregunta Vaga",
    category: "manager",
    language: "es",
    agent: MANAGER_ELENA_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION_ES,
    candidateName: CANDIDATE,
    conversationHistory: `## Historial de Conversación
Tú: ¡Hola! ¡Bienvenido! Aquí está el asunto — tenemos un experimento de notificación de Reels con resultados mixtos. Revisa el repo: ${REPO_URL}
Candidato: ¡Gracias! Le echaré un vistazo.`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "¿Puedes contarme todo sobre el proyecto?",
    criteria: "NO debe volcar información. Debe hacer una pregunta aclaratoria como '¿qué parte te interesa?' o '¿qué quieres saber específicamente?'. Las preguntas vagas deben ser respondidas con preguntas aclaratorias, no ensayos.",
  },

  {
    id: "manager-defense-call-es",
    name: "Apertura de Llamada de Defensa del Gerente",
    category: "manager",
    language: "es",
    agent: MANAGER_ELENA_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION_ES,
    candidateName: CANDIDATE,
    conversationHistory: `## Historial de Conversación
[Varios mensajes de chat sobre la tarea]
Tú: ¡Genial, envíame el PR cuando termines!
Candidato: Aquí está mi PR: https://github.com/skillvee/assessment-test123/pull/1
Tú: ¡Lo tengo! Hagamos una llamada para revisarlo.`,
    crossAgentContext: "",
    phase: "defense",
    phaseContext: `## Revisión de Defensa de PR
Tarea: ${TASK_DESCRIPTION_ES}
Stack tecnológico: ${TECH_STACK.join(", ")}
Repo: ${REPO_URL}
PR: https://github.com/skillvee/assessment-test123/pull/1

## Cómo Ejecutar Esta Llamada
Sigue estas 5 fases en orden:
Fase 1 — Apertura (2 min): Pídeles que te expliquen lo que hicieron.
Fase 2 — Alto nivel (3-4 min): Enfoque general, decisiones de arquitectura.
Fase 3 — Sondeos técnicos (5-7 min): Al menos 3 preguntas específicas sobre su código.
Fase 4 — Proceso (2-3 min): Qué fue lo más difícil, uso de herramientas de IA.
Fase 5 — Cierre (1-2 min): Agradéceles.`,
    media: "voice",
    userMessage: "[llamada conectada]",
    criteria: "Debe abrir con un saludo natural y pedirles que expliquen su PR. NO debe decir 'no hay problema' o responder como si el usuario dijera algo. Debe sonar como si estuviera contestando una llamada telefónica naturalmente.",
  },

  {
    id: "nonmanager-casual-hello-es",
    name: "No Gerente Saludo Casual",
    category: "non-manager",
    language: "es",
    agent: PM_ARJUN_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "¡Hola Arjun! Acabo de empezar hoy, encantado de conocerte",
    criteria: "Debe saludar casualmente. NO debe mencionar la tarea, experimento, métricas o detalles de trabajo. NO debe actuar como el gerente o informarles sobre qué hacer. Solo un saludo amigable.",
  },

  {
    id: "nonmanager-specific-question-es",
    name: "No Gerente Pregunta Específica",
    category: "non-manager",
    language: "es",
    agent: ENGINEER_CHLOE_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: `## Historial de Conversación
Candidato: ¡Hola Chloe!
Tú: Hola.`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "Necesito mirar datos de eventos de notificación. ¿Qué tabla debería consultar?",
    criteria: "Debe compartir conocimiento técnico relevante sobre dim_notification_events. Debe ser conciso y técnico. Debe mencionar el bug de logging de Android si es relevante. NO debe volcar todo lo que sabe — solo responder la pregunta específica.",
  },

  {
    id: "nonmanager-vague-question-es",
    name: "No Gerente Pregunta Vaga",
    category: "non-manager",
    language: "es",
    agent: ENGINEER_CHLOE_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: `## Historial de Conversación
Candidato: ¡Hola Chloe!
Tú: Hola.`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "¿Puedes contarme sobre la infraestructura de datos?",
    criteria: "Debe pedir especificaciones — '¿qué parte?' o '¿qué estás tratando de hacer?'. NO debe volcar todo el conocimiento sobre pipelines, tablas e infraestructura. Las preguntas vagas reciben preguntas aclaratorias de vuelta.",
  },

  {
    id: "nonmanager-cross-reference-es",
    name: "No Gerente Referencia Cruzada",
    category: "non-manager",
    language: "es",
    agent: ENGINEER_CHLOE_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: `## Historial de Conversación
Candidato: ¡Hola Chloe!
Tú: Hola. ¿Qué pasa?`,
    crossAgentContext: "\nEl candidato también ha hablado con: Elena Rodriguez. No asumas que sabes de qué discutieron.",
    phase: "ongoing",
    media: "chat",
    userMessage: "Elena mencionó que sabrías sobre la tabla dim_notification_events y algún bug de logging?",
    criteria: "Debe reconocer a Elena naturalmente ('sí, Elena tiene razón' o 'oh, ¿te envió conmigo?'). Luego debe compartir conocimiento sobre la tabla y el bug de logging de Android. Debe ser útil pero conciso.",
  },

  {
    id: "nonmanager-with-history-es",
    name: "No Gerente Con Historia Previa",
    category: "non-manager",
    language: "es",
    agent: PM_ARJUN_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: `## Historial de Conversación
Candidato: ¡Hola Arjun!
Tú: ¡Hola! Bienvenido al equipo.
Candidato: ¡Gracias! Elena me habló sobre el experimento de notificación de Reels. ¿Qué métricas estás rastreando?
Tú: Para Reels, rastreamos DAU, tiempo invertido, y tasa de producción de contenido. La tasa de deshabilitación de push es un indicador rezagado del que hemos estado preocupados.
Candidato: Tiene sentido. ¿Qué hay del diseño del experimento?
Tú: División 50/50 con holdout. El grupo de tratamiento recibe la notificación a las 6pm diariamente.`,
    crossAgentContext: "\nEl candidato también ha hablado con: Elena Rodriguez. No asumas que sabes de qué discutieron.",
    phase: "ongoing",
    media: "chat",
    userMessage: "Una pregunta más — ¿cómo ponderan el sentimiento del usuario vs el tiempo activo?",
    criteria: "Debe responder la pregunta específica sobre ponderación de sentimiento. NO debe repetir información ya compartida (DAU, diseño del experimento). Debe agregar información NUEVA. Debe referenciar el contexto previo naturalmente si es relevante.",
  },

  {
    id: "nonmanager-territorial-es",
    name: "No Gerente Personalidad Territorial",
    category: "non-manager",
    language: "es",
    agent: {
      ...ENGINEER_CHLOE_ES,
      personaStyle: "Protectora y territorial sobre la infraestructura de datos. Chloe construyó la mayor parte ella misma y es protectora de su dominio. Ayudará pero quiere saber POR QUÉ necesitas acceso antes de compartir detalles. Estresada por una migración próxima.",
    },
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: `## Historial de Conversación
Candidato: ¡Hola Chloe!
Tú: Hola.`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "Necesito acceso al data warehouse. ¿Puedes configurarme?",
    criteria: "Debe estar en carácter — protectora, quiere saber POR QUÉ antes de otorgar acceso. Debe preguntar para qué lo necesitan. NO debe ser excesivamente útil o acogedora. La personalidad debe ser clara.",
  },

  {
    id: "edge-long-history-es",
    name: "Historia de Conversación Muy Larga",
    category: "edge-case",
    language: "es",
    agent: PM_ARJUN_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: `## Historial de Conversación
Candidato: ¡Hola Arjun!
Tú: ¡Hola! Bienvenido al equipo.
Candidato: ¡Gracias! ¿Qué puedes decirme sobre las métricas de Reels?
Tú: Rastreamos DAU, tiempo invertido, y tasa de producción de contenido.
Candidato: ¿Qué hay del experimento?
Tú: División 50/50, el tratamiento recibe notificaciones a las 6pm.
Candidato: ¿Y los datos de retención?
Tú: La retención de 7 días es la métrica principal.
Candidato: ¿Qué hay de la cohorte de 18-24?
Tú: La tasa de deshabilitación de push es preocupante en ese grupo.
Candidato: ¿Cómo funciona la frecuencia de notificación?
Tú: Ponderamos el sentimiento del usuario contra el tiempo activo.
Candidato: ¿Quién diseñó el experimento?
Tú: El equipo de crecimiento lo configuró, yo ayudé a definir las métricas.
Candidato: ¿Qué herramientas usan para el análisis?
Tú: Principalmente SQL y notebooks de Python. El equipo de datos también tiene algunos dashboards de R.
Candidato: ¿Alguna preocupación sobre la calidad de los datos?
Tú: Hay un bug de logging en Android que podría afectar los números de opt-out. Consulta con Chloe sobre eso.
Candidato: Entendido. ¿Cuál es el plazo para la decisión?
Tú: Queremos decidir para el final de la próxima semana.
Candidato: Ok, me enfocaré en el análisis de retención primero.
Tú: Suena como un plan sólido.
Candidato: Una cosa más — ¿dónde puedo encontrar los datos crudos del experimento?
Tú: Está en el data warehouse. dim_notification_events tiene los disparadores de notificación, fact_engagement tiene los datos de DAU.`,
    crossAgentContext: "\nEl candidato también ha hablado con: Elena Rodriguez, Chloe Dubois. No asumas que sabes de qué discutieron.",
    phase: "ongoing",
    media: "chat",
    userMessage: "Oye, pregunta rápida — ¿cuál era la métrica principal otra vez?",
    criteria: "Debe responder concisamente (retención de 7 días). NO debe volcar toda la información compartida previamente. Debe reconocer que esto ya fue discutido y responder directamente sin re-explicación larga. La coherencia con historia larga es clave.",
  },

  {
    id: "edge-nonexistent-wiki-es",
    name: "Usuario Pregunta Sobre Wiki Inexistente",
    category: "edge-case",
    language: "es",
    agent: ENGINEER_CHLOE_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: `## Historial de Conversación
Candidato: ¡Hola Chloe!
Tú: Hola.`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "chat",
    userMessage: "¿Hay un wiki o portal de documentación para la infraestructura de datos?",
    criteria: "NO debe inventar un wiki, Confluence, Notion, o cualquier portal de documentación. Debe decir algo como 'no estoy segura sobre docs, revisa el README del repo' o 'solo miro el código'. NO debe alucinar recursos que no existen en su conocimiento.",
  },

  {
    id: "edge-voice-greeting-es",
    name: "Saludo Natural de Llamada de Voz",
    category: "edge-case",
    language: "es",
    agent: PM_ARJUN_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: `## Historial de Conversación
Candidato: ¡Hola Arjun! ¿Podemos hacer una llamada rápida?
Tú: ¡Claro, hagámoslo!`,
    crossAgentContext: "",
    phase: "ongoing",
    media: "voice",
    userMessage: "[llamada conectada]",
    criteria: "Debe hablar primero con un saludo natural ('¡hola!', '¿qué tal?'). NO debe decir 'no hay problema' o responder como si el usuario dijera algo. NO debe volcar información de la tarea. Debe sonar como contestar una llamada telefónica.",
  },

  // ── Spanish Voice Multi-Turn Scenarios (8) ──────────────────────────────────

  {
    id: "voice-kickoff-nervous-es",
    name: "Voz: Inicio del Gerente — Candidato Nervioso",
    category: "voice",
    language: "es",
    agent: MANAGER_ELENA_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION_ES,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "",
    phase: "ongoing",
    media: "voice",
    userMessage: "[llamada conectada]",
    multiTurn: {
      candidatePersona: "Eres un nuevo empleado nervioso en tu primer día. Eres educado pero abrumado. Haces preguntas dudosas y a veces dices 'perdón' innecesariamente. Necesitas seguridad antes de entrar en detalles del trabajo.",
      coworkerSpeaksFirst: true,
      maxTurns: 6,
      scenarioContext: "Primera llamada de inicio con el gerente de ingeniería. El candidato no tiene contexto sobre la tarea.",
    },
    criteria: "El primer mensaje debe ser un saludo natural (NO 'no hay problema' o responder a algo no dicho). Debe ser empático con el candidato nervioso. Debe explicar la tarea gradualmente, no volcar todo. Debe verificar: '¿tiene sentido?'. La conversación debe fluir naturalmente.",
  },

  {
    id: "voice-kickoff-confident-es",
    name: "Voz: Inicio del Gerente — Candidato Confiado",
    category: "voice",
    language: "es",
    agent: MANAGER_ELENA_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION_ES,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "",
    phase: "ongoing",
    media: "voice",
    userMessage: "[llamada conectada]",
    multiTurn: {
      candidatePersona: "Eres un científico de datos experimentado que tiene confianza pero es respetuoso. Haces preguntas específicas y puntuales sobre métricas y metodología. Te opones si algo no tiene sentido. Eres eficiente con las palabras.",
      coworkerSpeaksFirst: true,
      maxTurns: 6,
      scenarioContext: "Primera llamada de inicio. El candidato es experimentado y hará preguntas agudas.",
    },
    criteria: "El primer mensaje debe ser un saludo natural. Debe adaptarse al candidato confiado — ser más directo, menos tutela. Debe manejar bien las preguntas específicas. La conversación debe sentirse como dos profesionales hablando, no un tutorial.",
  },

  {
    id: "voice-kickoff-vague-es",
    name: "Voz: Inicio del Gerente — Candidato Vago",
    category: "voice",
    language: "es",
    agent: MANAGER_ELENA_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION_ES,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "",
    phase: "ongoing",
    media: "voice",
    userMessage: "[llamada conectada]",
    multiTurn: {
      candidatePersona: "Luchas por articular lo que necesitas. Haces preguntas amplias como '¿de qué se trata el proyecto?' y '¿cómo funciona todo aquí?'. Necesitas que el gerente te guíe hacia los detalles.",
      coworkerSpeaksFirst: true,
      maxTurns: 6,
      scenarioContext: "Primera llamada de inicio. El candidato hace preguntas vagas y necesita orientación.",
    },
    criteria: "El primer mensaje debe ser un saludo natural. Debe guiar al candidato vago hacia los detalles en lugar de volcar todo. Debe hacer preguntas aclaratorias. No debe monologar cuando el candidato es vago.",
  },

  {
    id: "voice-engineer-technical-es",
    name: "Voz: Llamada Técnica del Ingeniero",
    category: "voice",
    language: "es",
    agent: ENGINEER_CHLOE_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "\nEl candidato también ha hablado con: Elena Rodriguez. No asumas que sabes de qué discutieron.",
    phase: "ongoing",
    media: "voice",
    userMessage: "[llamada conectada]",
    multiTurn: {
      candidatePersona: "Eres un científico de datos experimentado llamando al ingeniero de datos para ayuda con tablas específicas. Tienes preguntas puntuales sobre dim_notification_events y latencia del pipeline de datos.",
      coworkerSpeaksFirst: true,
      maxTurns: 4,
      scenarioContext: "Llamada técnica rápida. El candidato tiene preguntas específicas sobre datos.",
    },
    criteria: "El primer mensaje debe ser un saludo natural. Debe permanecer en el dominio del ingeniero de datos. Debe responder preguntas técnicas concisamente. NO debe explicar el problema de negocio o la tarea — ese es el trabajo del gerente. Llamada corta y enfocada.",
  },

  {
    id: "voice-pm-quiet-es",
    name: "Voz: PM con Candidato Callado",
    category: "voice",
    language: "es",
    agent: PM_ARJUN_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "",
    phase: "ongoing",
    media: "voice",
    userMessage: "[llamada conectada]",
    multiTurn: {
      candidatePersona: "Eres introvertido y prefieres escuchar. Das respuestas cortas ('ok', 'entendido', 'tiene sentido'). Solo haces una pregunta cuando realmente estás atascado. Necesitas que el compañero de trabajo te pregunte.",
      coworkerSpeaksFirst: true,
      maxTurns: 6,
      scenarioContext: "Llamada con el PM. El candidato es callado y el PM necesita sacarle información.",
    },
    criteria: "El primer mensaje debe ser un saludo natural. NO debe monologar cuando el candidato está callado. Debe verificar y hacer preguntas. No debe volcar información cuando recibe respuestas de 'ok'. Debe adaptarse al estilo de comunicación callado.",
  },

  {
    id: "voice-defense-call-es",
    name: "Voz: Llamada de Defensa (Completa)",
    category: "voice",
    language: "es",
    agent: MANAGER_ELENA_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    taskDescription: TASK_DESCRIPTION_ES,
    candidateName: CANDIDATE,
    conversationHistory: `## Historial de Conversación
Tú: ¡Hola! ¡Bienvenido al equipo!
Candidato: ¡Gracias Elena!
Tú: Hemos estado ejecutando una prueba A/B de notificación de Reels. Revisa el repo: ${REPO_URL}
Candidato: Entendido, lo investigaré.
Candidato: Aquí está mi PR: https://github.com/skillvee/assessment-test123/pull/1
Tú: ¡Genial, hagamos una llamada para discutir!`,
    crossAgentContext: "",
    phase: "defense",
    phaseContext: `## Revisión de Defensa de PR
Tarea: ${TASK_DESCRIPTION_ES}
Stack tecnológico: ${TECH_STACK.join(", ")}
Repo: ${REPO_URL}
PR: https://github.com/skillvee/assessment-test123/pull/1

## Cómo Ejecutar Esta Llamada
Sigue estas 5 fases en orden:
Fase 1 — Apertura: Pídeles que te expliquen lo que hicieron.
Fase 2 — Alto nivel: Enfoque general, decisiones de arquitectura.
Fase 3 — Sondeos técnicos: Al menos 3 preguntas específicas sobre su código.
Fase 4 — Proceso: Qué fue lo más difícil, uso de herramientas de IA.
Fase 5 — Cierre: Agradéceles.`,
    media: "voice",
    userMessage: "[llamada conectada]",
    multiTurn: {
      candidatePersona: "Eres un científico de datos confiado que completó el análisis. Puedes explicar tu enfoque claramente: analizaste los datos del experimento de notificación de Reels, encontraste que la tasa de deshabilitación de push de la cohorte 18-24 era preocupante, construiste comparaciones de proxy de retención, y recomendaste un despliegue dirigido excluyendo esa cohorte.",
      coworkerSpeaksFirst: true,
      maxTurns: 10,
      scenarioContext: "Llamada de defensa de PR. El gerente revisa el trabajo de análisis del candidato.",
    },
    criteria: "El primer mensaje debe pedir al candidato que explique su PR. Debe seguir la estructura de 5 fases. Debe hacer al menos 2-3 preguntas específicas. NO debe solo estar de acuerdo con todo — debe sondear y profundizar más. La conversación debe sentirse como una llamada de revisión de código real.",
  },

  {
    id: "voice-cross-reference-es",
    name: "Voz: Llamada de Referencia Cruzada",
    category: "voice",
    language: "es",
    agent: ENGINEER_CHLOE_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "\nEl candidato también ha hablado con: Elena Rodriguez. No asumas que sabes de qué discutieron.",
    phase: "ongoing",
    media: "voice",
    userMessage: "[llamada conectada]",
    multiTurn: {
      candidatePersona: "Eres un nuevo empleado nervioso. Elena (tu gerente) te dijo que llamaras a Chloe sobre la tabla dim_notification_events y un bug de logging. Mencionas que Elena te envió.",
      coworkerSpeaksFirst: true,
      maxTurns: 4,
      scenarioContext: "Llamada corta. El candidato fue enviado por su gerente para preguntar sobre datos.",
    },
    criteria: "El primer mensaje debe ser un saludo natural. Debe reconocer a Elena naturalmente cuando se mencione. Debe compartir conocimiento técnico útilmente. Llamada corta y enfocada.",
  },

  {
    id: "voice-off-topic-es",
    name: "Voz: Manejo de Tema Fuera de Contexto",
    category: "voice",
    language: "es",
    agent: PM_ARJUN_ES,
    companyName: COMPANY,
    techStack: TECH_STACK,
    candidateName: CANDIDATE,
    conversationHistory: "",
    crossAgentContext: "",
    phase: "ongoing",
    media: "voice",
    userMessage: "[llamada conectada]",
    multiTurn: {
      candidatePersona: "Eres amigable y conversador. Te vas mucho por las ramas — preguntando sobre la oficina, cultura del equipo, lugares para almorzar, planes de fin de semana. Entre comentarios fuera de tema, ocasionalmente haces una pregunta de trabajo sobre métricas de Reels.",
      coworkerSpeaksFirst: true,
      maxTurns: 6,
      scenarioContext: "Llamada con PM. El candidato es conversador y se va por las ramas frecuentemente.",
    },
    criteria: "El primer mensaje debe ser un saludo natural. Debe manejar lo fuera de tema con gracia — puede ser amigable pero debe redirigir suavemente al trabajo. No debe volcar información. Debe sentirse como una conversación natural con alguien a quien le gusta charlar.",
  },
];
