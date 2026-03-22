/* ── Educational content for each orchestration pattern ────── */

export interface PatternAgent {
  name: string;
  role: string;
  description: string;
}

export interface SuggestedPrompt {
  label: string;
  prompt: string;
}

export interface PatternContent {
  name: string;
  icon: string;
  tagline: string;
  description: string;
  whenToUse: string[];
  architectureMermaid: string;
  howItWorks: string[];
  eventFlow: string;
  agents: PatternAgent[];
  tradeoffs: {
    pros: string[];
    cons: string[];
  };
  suggestedPrompts: SuggestedPrompt[];
}

/* ── Router ──────────────────────────────────────────────────── */

const router: PatternContent = {
  name: "router",
  icon: "\u{1F500}",
  tagline: "Intent-based routing to specialist agents",
  description:
    "A classifier agent examines the user's input, determines intent, and routes to the appropriate specialist agent. Each specialist handles a specific domain with tailored system prompts.",
  whenToUse: [
    "Customer support: route tickets to billing, technical, or general support",
    "Help desks: dispatch queries to the right team based on topic",
    "Any scenario where the response strategy depends on input classification",
  ],
  architectureMermaid: `graph LR
    Input[User Input] --> Router[Router Agent<br/>classifier]
    Router -->|BILLING| Billing[Billing Specialist]
    Router -->|TECHNICAL| Technical[Technical Specialist]
    Router -->|GENERAL| General[General Specialist]
    Billing --> Output[Response]
    Technical --> Output
    General --> Output`,
  howItWorks: [
    "Router agent receives the user's message and classifies intent into one of three categories: BILLING, TECHNICAL, or GENERAL",
    "A handoff event is emitted indicating which specialist was selected and why",
    "The matched specialist agent processes the original input with domain-specific expertise",
    "The specialist's streamed response becomes the final output",
  ],
  eventFlow: `agent_start  {agent: "router", role: "classifier"}
chunk        {agent: "router", content: "BILLING"}
agent_end    {agent: "router", ...}
handoff      {from: "router", to: "billing", reason: "billing intent detected"}
agent_start  {agent: "billing", role: "specialist"}
chunk        {agent: "billing", content: "I can help with your invoice..."}
agent_end    {agent: "billing", ...}
done         {totalUsage: {...}}`,
  agents: [
    {
      name: "router",
      role: "classifier",
      description:
        "Classifies user intent into BILLING, TECHNICAL, or GENERAL",
    },
    {
      name: "billing",
      role: "specialist",
      description: "Invoices, payments, refunds, subscriptions, pricing",
    },
    {
      name: "technical",
      role: "specialist",
      description: "Bugs, crashes, errors, performance, feature help",
    },
    {
      name: "general",
      role: "specialist",
      description:
        "Business hours, company info, accounts, everything else",
    },
  ],
  tradeoffs: {
    pros: [
      "Fast: only two LLM calls (classify + respond), minimal latency overhead",
      "Simple: easy to add new specialists by extending the category list",
    ],
    cons: [
      "Rigid: classification is single-label; ambiguous inputs may misroute",
      "No fallback loop: if the specialist gives a poor answer, there is no retry mechanism",
    ],
  },
  suggestedPrompts: [
    {
      label: "Clean billing route",
      prompt: "My invoice shows the wrong amount",
    },
    {
      label: "Technical issue",
      prompt: "The app crashes when I try to upload a file",
    },
    {
      label: "Complex multi-intent",
      prompt:
        "I want to cancel my subscription and get a refund for the remaining months",
    },
  ],
};

/* ── Pipeline ────────────────────────────────────────────────── */

const pipeline: PatternContent = {
  name: "pipeline",
  icon: "\u{2699}\u{FE0F}",
  tagline: "Sequential chain of agents, each refining the previous output",
  description:
    "A sequential chain of agents where each stage's output becomes the next stage's input. Implements a content creation workflow: research, write, then edit.",
  whenToUse: [
    "Content creation: research a topic, draft an article, polish the final version",
    "Data processing: extract, transform, load pipelines with LLM agents at each step",
    "Multi-step transforms: any workflow where each step refines the previous output",
  ],
  architectureMermaid: `graph LR
    Input[User Input] --> Researcher[Researcher<br/>research expert]
    Researcher -->|handoff| Writer[Writer<br/>content writer]
    Writer -->|handoff| Editor[Editor<br/>editor]
    Editor --> Output[Final Output]`,
  howItWorks: [
    "Researcher gathers information and context about the user's topic",
    "Output passes to the Writer, who drafts structured content based on the research",
    "Output passes to the Editor, who refines for clarity, grammar, and coherence",
    "The editor's output is the final result",
  ],
  eventFlow: `agent_start  {agent: "researcher", role: "research expert"}
chunk        {agent: "researcher", content: "...research findings..."}
agent_end    {agent: "researcher", ...}
handoff      {from: "researcher", to: "writer", reason: "passing to next stage"}
agent_start  {agent: "writer", role: "content writer"}
chunk        {agent: "writer", content: "...draft article..."}
agent_end    {agent: "writer", ...}
handoff      {from: "writer", to: "editor", reason: "passing to next stage"}
agent_start  {agent: "editor", role: "editor"}
chunk        {agent: "editor", content: "...polished article..."}
agent_end    {agent: "editor", ...}
done         {totalUsage: {...}}`,
  agents: [
    {
      name: "researcher",
      role: "research expert",
      description: "Gathers facts, data, and context about the topic",
    },
    {
      name: "writer",
      role: "content writer",
      description: "Drafts structured content from research findings",
    },
    {
      name: "editor",
      role: "editor",
      description: "Polishes for clarity, grammar, and coherence",
    },
  ],
  tradeoffs: {
    pros: [
      "Predictable: fixed execution order, easy to reason about",
      "Composable: add or remove stages by editing the pipeline array",
      "Cumulative quality: each stage builds on the previous, improving output",
    ],
    cons: [
      "No parallelism: stages run sequentially; total latency is the sum of all stages",
      "No feedback: a later stage cannot ask an earlier stage to redo its work",
      "Context growth: each stage receives the full output of the previous stage, which can grow large",
    ],
  },
  suggestedPrompts: [
    {
      label: "Standard blog post",
      prompt:
        "Write a blog post about WebAssembly and its impact on web development",
    },
    {
      label: "Comparison piece",
      prompt:
        "Write a technical article about edge computing vs cloud computing",
    },
    {
      label: "Historical scope",
      prompt:
        "Write an article about the evolution of programming languages from the 1950s to today",
    },
  ],
};

/* ── Supervisor ──────────────────────────────────────────────── */

const supervisor: PatternContent = {
  name: "supervisor",
  icon: "\u{1F441}\u{FE0F}",
  tagline: "A supervisor plans, delegates, reviews, and retries with feedback",
  description:
    "A supervisor agent plans subtasks, dispatches them to specialized workers, reviews each worker's output for quality, and retries with feedback if the result is inadequate. Implements a research workflow with search, analysis, and summary workers.",
  whenToUse: [
    "Research tasks: gather information, analyze it, and produce a summary",
    "Quality-critical workflows: when outputs must meet a quality bar before proceeding",
    "Complex queries: tasks that benefit from decomposition into smaller subtasks",
  ],
  architectureMermaid: `graph LR
    Input[User Input] --> Supervisor[Supervisor<br/>planner + reviewer]
    Supervisor -->|plan| Search[Search]
    Search -->|review| Supervisor
    Supervisor -->|plan| Analysis[Analysis]
    Analysis -->|review| Supervisor
    Supervisor -->|plan| Summary[Summary]
    Summary -->|review| Supervisor
    Supervisor --> Output[Final Output]`,
  howItWorks: [
    "Supervisor plans: given the user's input, generates a JSON plan with ordered subtasks, each assigned to a worker",
    "Worker execution: each subtask is dispatched to its assigned worker with context from previous workers",
    "Quality review: after each worker completes, the supervisor reviews the output and returns an adequate/inadequate verdict with feedback",
    "Retry loop: if output is inadequate, the worker retries with the supervisor's feedback appended (up to 3 attempts)",
    "Final output: the last worker's accepted output becomes the pattern's result",
  ],
  eventFlow: `agent_start  {agent: "supervisor", role: "planner"}
chunk        {agent: "supervisor", content: "Plan: search -> analysis -> summary"}
agent_end    {agent: "supervisor", ...}
handoff      {from: "supervisor", to: "search", reason: "Dispatching search task"}
agent_start  {agent: "search", role: "information gatherer"}
chunk        {agent: "search", content: "...findings..."}
agent_end    {agent: "search", ...}
handoff      {from: "search", to: "supervisor", reason: "Reviewing search output"}
agent_start  {agent: "supervisor", role: "reviewer"}
chunk        {agent: "supervisor", content: "Review: adequate. ..."}
agent_end    {agent: "supervisor", ...}
handoff      {from: "supervisor", to: "analysis", reason: "Dispatching analysis task"}
...
done         {totalUsage: {...}}`,
  agents: [
    {
      name: "supervisor",
      role: "planner + reviewer",
      description:
        "Plans subtasks, dispatches to workers, reviews output quality",
    },
    {
      name: "search",
      role: "information gatherer",
      description: "Finds facts, data, and sources",
    },
    {
      name: "analysis",
      role: "analyst",
      description:
        "Identifies patterns, compares perspectives, draws insights",
    },
    {
      name: "summary",
      role: "summarizer",
      description: "Produces clear, comprehensive reports",
    },
  ],
  tradeoffs: {
    pros: [
      "Quality assurance: review loop catches poor outputs before they propagate",
      "Adaptive: retry with feedback often produces better results on the second attempt",
      "Transparent: each planning and review step is visible in the trace",
    ],
    cons: [
      "Higher latency: review adds an LLM call after every worker, and retries multiply cost",
      "Max 3 iterations: the retry cap prevents infinite loops but may stop before quality is reached",
      "Planning reliability: the supervisor must produce valid JSON plans; malformed output causes errors",
    ],
  },
  suggestedPrompts: [
    {
      label: "Broad research",
      prompt:
        "Research the current state of quantum computing and its potential applications",
    },
    {
      label: "Analytical task",
      prompt:
        "Analyze the impact of large language models on software development practices",
    },
    {
      label: "Focused investigation",
      prompt:
        "Investigate the latest developments in renewable energy storage technologies",
    },
  ],
};

/* ── Debate ──────────────────────────────────────────────────── */

const debate: PatternContent = {
  name: "debate",
  icon: "\u{2696}\u{FE0F}",
  tagline: "Opposing agents debate, then a judge delivers a verdict",
  description:
    "Two debater agents argue opposing sides of a thesis over multiple rounds, then a judge agent evaluates the arguments and delivers a verdict. Implements an investment analysis scenario with bull (for) and bear (against) debaters.",
  whenToUse: [
    "Investment analysis: weigh arguments for and against an investment thesis",
    "Decision-making: surface pros and cons before committing to a course of action",
    "Critical thinking: force exploration of opposing viewpoints on any topic",
  ],
  architectureMermaid: `graph LR
    Input[Thesis] --> Bull[Bull<br/>argues FOR]
    Bull -->|round 1| Bear[Bear<br/>argues AGAINST]
    Bear -->|round 2| Bull
    Bear -->|debate complete| Judge[Judge<br/>verdict]
    Judge --> Output[Final Verdict]`,
  howItWorks: [
    "The bull debater presents arguments in favor of the thesis",
    "The bear debater counters with arguments against",
    "This repeats for 2 rounds (configurable), with each debater seeing the full transcript so far",
    "After all rounds, the judge receives the complete debate transcript and delivers a verdict with reasoning",
  ],
  eventFlow: `agent_start  {agent: "bull", role: "debater"}
chunk        {agent: "bull", content: "...arguments for..."}
agent_end    {agent: "bull", ...}
handoff      {from: "bull", to: "bear", reason: "round 1"}
agent_start  {agent: "bear", role: "debater"}
chunk        {agent: "bear", content: "...arguments against..."}
agent_end    {agent: "bear", ...}
handoff      {from: "bear", to: "bull", reason: "next round"}
...
handoff      {from: "bear", to: "judge", reason: "debate complete"}
agent_start  {agent: "judge", role: "judge"}
chunk        {agent: "judge", content: "...verdict and reasoning..."}
agent_end    {agent: "judge", ...}
done         {totalUsage: {...}}`,
  agents: [
    {
      name: "bull",
      role: "debater",
      description: "Argues in favor of the thesis",
    },
    {
      name: "bear",
      role: "debater",
      description: "Argues against the thesis",
    },
    {
      name: "judge",
      role: "judge",
      description:
        "Evaluates all arguments and declares a winner with reasoning",
    },
  ],
  tradeoffs: {
    pros: [
      "Balanced analysis: forces exploration of both sides, reducing one-sided bias",
      "Structured output: the judge synthesizes a clear verdict from opposing arguments",
      "Engaging: the debate format produces readable, well-argued content",
    ],
    cons: [
      "High token usage: each debater sees the growing transcript; costs scale with round count",
      'Fixed sides: bull is always "for", bear is always "against" \u2014 no nuanced positioning',
      "Judge quality: the verdict is only as good as the judge's ability to weigh arguments",
    ],
  },
  suggestedPrompts: [
    {
      label: "Classic investment thesis",
      prompt:
        "Should a conservative investor allocate 5% of their portfolio to Bitcoin?",
    },
    {
      label: "Tech valuation",
      prompt:
        "Is investing in AI semiconductor companies at current valuations a good long-term bet?",
    },
    {
      label: "Macro analysis",
      prompt:
        "Should institutional investors increase allocation to emerging markets in the current economic climate?",
    },
  ],
};

/* ── Swarm ───────────────────────────────────────────────────── */

const swarm: PatternContent = {
  name: "swarm",
  icon: "\u{1F41D}",
  tagline: "Dynamic agent-to-agent handoffs without central routing",
  description:
    "Each agent decides independently whether to handle a request or pass it to another agent, creating an emergent routing topology. Unlike Router, there is no central classifier \u2014 agents self-organize around customer needs.",
  whenToUse: [
    "Customer support: triage, sales, support, and billing agents self-organize around customer needs",
    "Multi-domain workflows: when the right specialist depends on context discovered during conversation",
    "Decentralized routing: when no single agent has enough context to route upfront",
  ],
  architectureMermaid: `graph LR
    Input[Query] --> Triage[Triage]
    Triage --> Output[Response]
    Triage -->|handoff| Sales[Sales]
    Triage -->|handoff| Support[Support]
    Triage -->|handoff| Billing[Billing]
    Sales <-->|handoff| Support
    Sales <-->|handoff| Billing
    Support <-->|handoff| Billing
    Sales --> Output
    Support --> Output
    Billing --> Output`,
  howItWorks: [
    "Every query starts at the triage agent, which analyzes intent",
    "If triage can handle it directly (greetings, vague questions), it responds",
    "Otherwise, triage includes a [HANDOFF:target] directive in its response",
    "The runner detects the directive, emits a handoff event, and runs the target agent",
    "The target agent can also hand off to another agent if needed",
    "The chain continues until an agent responds without a handoff (max 5 iterations)",
  ],
  eventFlow: `agent_start  {agent: "triage", role: "triage"}
chunk        {agent: "triage", content: "...I'll connect you..."}
agent_end    {agent: "triage", ...}
handoff      {from: "triage", to: "billing", reason: "triage handed off to billing"}
agent_start  {agent: "billing", role: "specialist"}
chunk        {agent: "billing", content: "...I can help with your invoice..."}
agent_end    {agent: "billing", ...}
done         {totalUsage: {...}}`,
  agents: [
    {
      name: "triage",
      role: "triage",
      description:
        "Initial contact, analyzes intent, hands off or responds directly",
    },
    {
      name: "sales",
      role: "specialist",
      description: "Pricing, plans, upgrades, purchasing",
    },
    {
      name: "support",
      role: "specialist",
      description: "Technical issues, troubleshooting, bugs",
    },
    {
      name: "billing",
      role: "specialist",
      description: "Invoices, payments, refunds, subscriptions",
    },
  ],
  tradeoffs: {
    pros: [
      "Flexible routing: agents discover the right handler through conversation, not classification",
      "Context preservation: each agent sees what the previous agent said, enabling warm handoffs",
      "Emergent behavior: new routing paths appear without changing a central router",
    ],
    cons: [
      "Unpredictable paths: harder to guarantee which agent handles a query",
      "Handoff loops: agents could ping-pong between each other (mitigated by max iteration limit)",
      "Higher latency: multi-hop chains add round-trips compared to direct routing",
    ],
  },
  suggestedPrompts: [
    {
      label: "Multi-hop (billing → technical)",
      prompt:
        "I was charged twice on my last invoice, and now my dashboard won't load either",
    },
    {
      label: "Vague → routed to sales",
      prompt: "Hi, I just signed up and I'm not sure what plan I need",
    },
    {
      label: "Billing + sales chain",
      prompt:
        "I'd like to upgrade my plan but my current invoice seems wrong",
    },
  ],
};

/* ── Map-Reduce ──────────────────────────────────────────────── */

const mapReduce: PatternContent = {
  name: "map-reduce",
  icon: "\u{1F504}",
  tagline: "Parallel fan-out to mappers with merged reduction",
  description:
    "A splitter decomposes input into independent sub-tasks, mapper agents process them in parallel via Promise.all(), then a reducer synthesizes all outputs into one coherent response.",
  whenToUse: [
    "Multi-faceted analysis: explore different angles on the same topic in parallel",
    "Comparative studies: evaluate multiple frameworks, technologies, or approaches side by side",
    "Parallel processing: independent subtasks that benefit from concurrency",
  ],
  architectureMermaid: `graph LR
    Input --> Splitter
    Splitter --> Mapper1[Mapper 1]
    Splitter --> Mapper2[Mapper 2]
    Splitter --> MapperN[Mapper N]
    Mapper1 --> Reducer
    Mapper2 --> Reducer
    MapperN --> Reducer
    Reducer --> Output`,
  howItWorks: [
    "Split \u2014 the SplitterAgent breaks the input into 2-4 independent sub-tasks using non-streaming chat",
    "Fan-out \u2014 one handoff event per mapper is emitted",
    "Map \u2014 all MapperAgents run concurrently via Promise.all(), each streaming its analysis",
    "Fan-in \u2014 a single handoff event signals all mappers are done",
    "Reduce \u2014 the ReducerAgent synthesizes all mapper outputs into one coherent response",
  ],
  eventFlow: `agent_start  {agent: "splitter", role: "splitter"}
chunk        {agent: "splitter", content: "...subtask plan..."}
agent_end    {agent: "splitter", ...}
handoff      {from: "splitter", to: "mapper-1", reason: "fan-out"}
handoff      {from: "splitter", to: "mapper-2", reason: "fan-out"}
agent_start  {agent: "mapper-1", role: "mapper"}
agent_start  {agent: "mapper-2", role: "mapper"}
chunk        {agent: "mapper-1", content: "...analysis A..."}
chunk        {agent: "mapper-2", content: "...analysis B..."}
agent_end    {agent: "mapper-1", ...}
agent_end    {agent: "mapper-2", ...}
handoff      {from: "mappers", to: "reducer", reason: "fan-in"}
agent_start  {agent: "reducer", role: "reducer"}
chunk        {agent: "reducer", content: "...synthesis..."}
agent_end    {agent: "reducer", ...}
done         {totalUsage: {...}}`,
  agents: [
    {
      name: "splitter",
      role: "splitter",
      description:
        "Breaks input into independent sub-tasks (non-streaming)",
    },
    {
      name: "mapper",
      role: "mapper",
      description: "Analyzes a single sub-task in detail (streaming, parallel)",
    },
    {
      name: "reducer",
      role: "reducer",
      description: "Synthesizes all mapper outputs into one coherent response",
    },
  ],
  tradeoffs: {
    pros: [
      "True parallelism: mappers run concurrently, reducing wall-clock time",
      "Comprehensive coverage: each subtask gets dedicated focused analysis",
      "Scalable: adding more mappers increases coverage without changing architecture",
    ],
    cons: [
      "Complex implementation: parallel streams with interleaved chunks require careful attribution",
      "Cost scales with mapper count: each mapper is a separate LLM call",
      "Splitter reliability: the splitter must produce clean JSON subtask decomposition",
    ],
  },
  suggestedPrompts: [
    {
      label: "3-way comparison",
      prompt:
        "Compare the pros and cons of remote work vs office work vs hybrid models",
    },
    {
      label: "Technology evaluation",
      prompt:
        "Analyze React, Vue, and Angular for a new enterprise project",
    },
    {
      label: "Multi-dimensional analysis",
      prompt:
        "Evaluate the economic, environmental, and social impacts of electric vehicles",
    },
  ],
};

/* ── Reflection ──────────────────────────────────────────────── */

const reflection: PatternContent = {
  name: "reflection",
  icon: "\u{1FA9E}",
  tagline: "Iterative generate-critique-revise loop with conditional exit",
  description:
    "A generator agent produces content, a critic agent evaluates it with a structured verdict, and the generator revises based on feedback. The loop repeats until the critic passes or a maximum iteration limit is reached. The only pattern featuring iterative self-improvement with conditional early exit.",
  whenToUse: [
    "Content refinement: producing high-quality writing through structured critique",
    "Iterative improvement: any task where output quality benefits from review cycles",
    "Quality gates: ensuring output meets specific criteria before acceptance",
  ],
  architectureMermaid: `graph LR
    Input[User Request] --> Generator[Generator]
    Generator -->|handoff| Critic[Critic]
    Critic -->|verdict: pass| Output[Final Output]
    Critic -->|verdict: revise| Generator`,
  howItWorks: [
    "The generator produces initial content from the user's request",
    "The critic evaluates against criteria (coherence, evidence, persuasiveness, clarity, completeness) and returns a JSON verdict: pass or revise with feedback",
    "If revise: the generator receives the original request, its previous draft, and the feedback, then produces a revised version",
    "The loop repeats until pass or max iterations (3) are reached",
    "On the final iteration, the critic is skipped \u2014 the generator's output is the final answer",
  ],
  eventFlow: `agent_start  {agent: "generator", role: "content generator"}
chunk        {agent: "generator", content: "...initial draft..."}
agent_end    {agent: "generator", ...}
handoff      {from: "generator", to: "critic", reason: "iteration 1 — reviewing"}
agent_start  {agent: "critic", role: "content critic"}
chunk        {agent: "critic", content: "...evaluation...{verdict: revise}"}
agent_end    {agent: "critic", ...}
handoff      {from: "critic", to: "generator", reason: "revision needed: ..."}
agent_start  {agent: "generator", role: "content generator"}
chunk        {agent: "generator", content: "...revised draft..."}
agent_end    {agent: "generator", ...}
handoff      {from: "generator", to: "critic", reason: "iteration 2 — reviewing"}
agent_start  {agent: "critic", role: "content critic"}
chunk        {agent: "critic", content: "...evaluation...{verdict: pass}"}
agent_end    {agent: "critic", ...}
done         {totalUsage: {...}}`,
  agents: [
    {
      name: "generator",
      role: "content generator",
      description:
        "Produces and revises content based on critic feedback",
    },
    {
      name: "critic",
      role: "content critic",
      description:
        "Evaluates quality, returns structured pass/revise verdict with feedback",
    },
  ],
  tradeoffs: {
    pros: [
      "Quality improvement: each iteration measurably improves output specificity and evidence",
      "Conditional exit: stops early when quality is sufficient, saving tokens",
      "Structured feedback: critic provides actionable, parseable verdicts (not just prose)",
    ],
    cons: [
      "Token cost: scales linearly with iterations \u2014 worst case is 3 generator + 2 critic calls",
      "Diminishing returns: third revision rarely adds as much value as the first",
      "Critic reliability: verdict parsing has fallback handling for malformed JSON",
    ],
  },
  suggestedPrompts: [
    {
      label: "Creative + structured",
      prompt:
        "Write a persuasive pitch for a startup that uses AI to reduce food waste in restaurants",
    },
    {
      label: "How-to content",
      prompt:
        "Write a comprehensive guide to starting a home composting system",
    },
    {
      label: "Professional writing",
      prompt:
        "Draft a company policy recommendation for transitioning to a hybrid remote work model",
    },
  ],
};

/* ── Registry ────────────────────────────────────────────────── */

export const PATTERN_CONTENT: Record<string, PatternContent> = {
  router,
  pipeline,
  supervisor,
  debate,
  swarm,
  "map-reduce": mapReduce,
  reflection,
};
