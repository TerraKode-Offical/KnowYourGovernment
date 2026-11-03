"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Mic,
  BookOpen,
  ShieldAlert,
  Copy,
  Check,
  ArrowRight,
  Camera,
  Server,
  Building,
  Shield,
  Users,
  Video,
} from "lucide-react";
import AnimatedSection from "@/components/features/AnimatedSection";

// Helper to build multi-paragraph text without template literals
function p(...paragraphs: string[]) {
  return paragraphs.join("\n\n");
}

// ─────────────────────────────────────────────
// Template data
// ─────────────────────────────────────────────

interface TemplateSet {
  id: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  title: string;
  subtitle: string;
  professional: SpeakingTemplate;
  assertive: SpeakingTemplate;
}

interface SpeakingTemplate {
  opening: string;
  body: string;
  closing: string;
  keyFacts: string[];
  suggestedQuestions: string[];
}

const TEMPLATES: TemplateSet[] = [
  {
    id: "flock-cameras",
    icon: Camera,
    title: "Oppose Flock Cameras & Mass Surveillance",
    subtitle: "License plate readers, facial recognition, and the surveillance state",
    professional: {
      opening:
        "Good evening, Council members. My name is [YOUR NAME] and I live in [NEIGHBORHOOD]. I am here today to respectfully but firmly oppose any expansion of automated license plate readers, Flock cameras, or facial recognition technology in our city.",
      body: p(
        "The arguments for this technology are always the same: public safety, catching criminals, protecting children. But the data does not support these claims at the scale proponents suggest.",
        "First, the cost. Flock camera contracts typically run between $2,500 and $4,000 per camera per year, plus installation and maintenance. Cities our size have spent hundreds of thousands of dollars on these systems with little to show for it in terms of actual violent crime reduction. A 2022 study by the George Mason University Mercatus Center found that license plate readers had no statistically significant effect on violent crime rates in the jurisdictions studied.",
        "Second, the error rate. Facial recognition technology misidentifies Black and Brown people at rates five to ten times higher than white people, according to NIST testing. In a city council meeting in Detroit, Robert Williams was wrongfully arrested in front of his family based on a faulty facial recognition match. That is not public safety. That is a civil rights violation waiting to happen.",
        "Third, function creep. These systems are sold for \"catching stolen cars\" but are inevitably used for immigration enforcement, protest monitoring, and tracking political opponents. The data does not stay local. Flock Safety shares data with hundreds of other jurisdictions and federal agencies through its \"Total Network.\" Once the infrastructure is built, the scope expands silently.",
        "Finally, the Constitution. The Supreme Court in Carpenter v. United States, 585 U.S. ___ (2018), ruled that warrantless access to historical cell-site location data violates the Fourth Amendment. Automated tracking of every vehicle entering and leaving our city is precisely the kind of mass surveillance the Framers feared. We do not need to live in a surveillance state to be safe."
      ),
      closing:
        "I urge this council to reject any proposal to expand automated surveillance in our city. If safety is the goal, invest in streetlights, community programs, and mental health services — not cameras that watch innocent people. Thank you.",
      keyFacts: [
        "Flock cameras cost $2,500–$4,000 per camera per year, not including installation or maintenance.",
        "A 2022 George Mason Mercatus Center study found license plate readers had no statistically significant effect on violent crime rates.",
        "NIST testing found facial recognition misidentifies Black and Brown people at 5–10x the rate of white people.",
        "Flock Safety shares data with hundreds of jurisdictions and federal agencies through its 'Total Network.'",
        "Carpenter v. United States (2018) ruled warrantless location tracking violates the Fourth Amendment.",
        "Detroit's Robert Williams was wrongfully arrested based on a faulty facial recognition match.",
      ],
      suggestedQuestions: [
        "Has this council conducted an independent cost-benefit analysis of surveillance cameras versus community investment?",
        "Will the data collected be shared with federal immigration enforcement or other agencies?",
        "What is the city's policy when facial recognition produces a false match that leads to a wrongful arrest?",
      ],
    },
    assertive: {
      opening:
        "My name is [YOUR NAME]. I am a taxpayer and a resident of this city. I am here to tell you: we will not accept mass surveillance in our community. Not now. Not ever.",
      body: p(
        "Let's cut through the sales pitch. Flock Safety and companies like them are here to make money off your fear. They show up with slick presentations about 'protecting the children' and before you know it, there's a camera on every corner recording every license plate, every face, every movement.",
        "Here is what they do not tell you. These cameras do not stop crime. They document it after the fact — if you're lucky. Study after study shows license plate readers do not reduce violent crime. What they do is create a permanent record of where every single person in this city drives, when they drives, and who they visit.",
        "And the errors? Facial recognition is a disaster. Robert Williams — a Black man in Detroit — was arrested in front of his kids because a computer got it wrong. That is not a bug. That is the system working exactly as designed, because these algorithms were trained on predominantly white faces and they fail catastrophically on everyone else.",
        "Function creep is not a theory — it is a guarantee. Flock already shares data with ICE, with the FBI, with hundreds of other cities. You are not just building a local camera network. You are plugging our residents into a national surveillance grid.",
        "The Fourth Amendment protects us from unreasonable searches. Carpenter v. United States says the government cannot track our location without a warrant. Mass automated surveillance is a warrantless search of every person who drives through this city. It is unconstitutional. It is un-American. And I am telling you right now: if you vote for this, we will remember. We will organize. And we will vote you out."
      ),
      closing:
        "Reject the cameras. Invest in people. And do not ever mistake surveillance for safety. Thank you.",
      keyFacts: [
        "Flock Safety shares data with ICE, FBI, and hundreds of other jurisdictions.",
        "Facial recognition algorithms misidentify Black people at rates up to 100x higher than white people in some NIST tests.",
        "License plate readers document crime after it happens; they do not prevent it.",
        "Carpenter v. United States (2018): warrantless location tracking violates the Fourth Amendment.",
        "Mass surveillance infrastructure always expands in scope beyond its original sales pitch.",
      ],
      suggestedQuestions: [
        "How much is Flock Safety paying in lobbying or campaign contributions to get this contract approved?",
        "Will you publicly commit that no data will ever be shared with ICE or federal immigration enforcement?",
        "If a resident is wrongfully arrested due to a faulty match, who is liable — the city or the vendor?",
      ],
    },
  },
  {
    id: "data-centers",
    icon: Server,
    title: "Oppose Harmful Data Center Development",
    subtitle: "Water usage, grid strain, noise, and broken tax promises",
    professional: {
      opening:
        "Good evening. My name is [YOUR NAME] and I am a resident of [NEIGHBORHOOD]. I am here to express serious concerns about the proposed data center development and to ask this council to reject any tax abatements or zoning variances for this project.",
      body: p(
        "Data centers are not the economic development miracle their promoters claim. They are massive industrial facilities that consume extraordinary resources while providing minimal local benefit.",
        "Water consumption is the first concern. A single large data center can use between 1 million and 5 million gallons of water per day for cooling. In a time of worsening drought and water scarcity, handing millions of gallons to a facility that employs fewer than 50 people is indefensible. The National Renewable Energy Laboratory has documented that data center water usage is rising rapidly as facilities get larger and denser.",
        "Electrical grid strain is the second. Data centers can consume as much electricity as a small city — 50 to 100 megawatts for a single campus. That strain raises rates for everyone else and increases reliance on fossil fuel plants. Google, Microsoft, and Amazon have all been cited for dramatically underestimating their energy demands during permitting, only to request massive grid upgrades after construction begins.",
        "Jobs are the third issue. Data centers are highly automated. A facility the size of multiple football fields may employ only 30 to 50 people, most of them technicians brought in from out of state. The promised 'hundreds of jobs' are construction jobs that last 18 months and then disappear.",
        "Tax abatements make this even worse. These facilities routinely demand 10- to 20-year property tax exemptions, meaning they use our water, our power, our roads, and our emergency services while paying nothing for them. The schools lose funding. The fire department loses funding. The residents pick up the tab.",
        "Finally, noise and quality of life. Data centers emit a constant low-frequency hum from cooling systems and backup generators. Residents living within a half-mile report sleep disruption, anxiety, and property value declines. Once built, these facilities operate 24/7 for decades.",
        "This is not economic development. It is resource extraction with a tech logo."
      ),
      closing:
        "I ask this council to reject the data center proposal and any associated tax breaks. If a company needs our water and our power, they can pay full taxes like every other business. Thank you.",
      keyFacts: [
        "A single large data center uses 1–5 million gallons of water per day for cooling.",
        "Data centers consume 50–100 megawatts — as much as a small city.",
        "A major data center typically employs only 30–50 permanent staff.",
        "Data centers routinely demand 10–20 year property tax abatements.",
        "Low-frequency noise from cooling systems disrupts sleep and reduces property values within a half-mile radius.",
        "Google, Microsoft, and Amazon have all been cited for underestimating energy demands during permitting.",
      ],
      suggestedQuestions: [
        "Has an independent environmental impact assessment been conducted on water usage and grid strain?",
        "How many permanent local jobs will this facility create, and what will the average wage be?",
        "If the company receives a tax abatement, which specific school and public safety budgets will be cut to compensate?",
      ],
    },
    assertive: {
      opening:
        "My name is [YOUR NAME]. I live here. I vote here. And I am telling you: this data center is a scam, and if you approve it, you are selling out this community for pennies on the dollar.",
      body: p(
        "Let's talk about what a data center actually is. It is a giant warehouse full of computers that suck down millions of gallons of our water, burn enough electricity to power a small city, and employ almost nobody from this town.",
        "Water. These things use one to five million gallons of water PER DAY. We are supposed to be conserving water. We are supposed to be planning for drought. And you want to hand millions of gallons to Amazon or Google so they can store cat videos? Absolutely not.",
        "Power. Fifty to a hundred megawatts. That is a small city. And you know what happens when the grid is strained? Our rates go up. The power company builds more fossil fuel plants. And we pay for it while the tech company gets a tax break.",
        "Jobs. Oh, they always promise jobs. Hundreds of jobs! What they do not tell you is that 90% of those jobs are construction temp work that lasts a year. The permanent jobs? Maybe thirty. And half of those are technicians they fly in from Virginia or California. The 'local economic benefit' is a lie.",
        "Taxes. This is the real kicker. They want a ten- to twenty-year tax abatement. That means they use our roads, our water, our fire department, our police — and pay nothing. Zero. While the rest of us pay full freight. While our schools are underfunded. While our teachers buy their own supplies.",
        "Noise. Have you ever stood next to a data center? It is a constant industrial hum. It does not stop. It does not take weekends off. People living within a half mile will lose sleep, lose property value, and lose their quality of life — permanently.",
        "You were elected to represent the people who live here. Not the corporations who want to extract our resources and leave. Vote no on this data center. And vote no on every tax abatement that comes with it."
      ),
      closing:
        "We are watching. We are organizing. And we will not forget who stood with the community and who stood with the corporations. Vote no.",
      keyFacts: [
        "1–5 million gallons of water per day for cooling.",
        "50–100 megawatts of electricity — equivalent to a small city.",
        "Only 30–50 permanent jobs, many filled by out-of-state technicians.",
        "10–20 year tax abatements = zero property tax revenue for decades.",
        "Constant low-frequency noise permanently degrades quality of life within a half-mile.",
        "Construction jobs are temporary; permanent local employment is minimal.",
      ],
      suggestedQuestions: [
        "Will you commit to publishing the full tax abatement agreement before any vote?",
        "What guarantees are in place that water usage will not increase beyond initial estimates?",
        "If property values decline near the facility, will the city compensate homeowners?",
      ],
    },
  },
  {
    id: "zoning",
    icon: Building,
    title: "Oppose Destructive Zoning & Overdevelopment",
    subtitle: "Infrastructure strain, affordable housing loss, and developer influence",
    professional: {
      opening:
        "Good evening, Council members. My name is [YOUR NAME], a resident of [NEIGHBORHOOD]. I am here to oppose the rezoning request for [PROJECT NAME/ADDRESS] and to ask this council to prioritize existing residents over developer profits.",
      body: p(
        "This rezoning proposal may be framed as 'growth' or 'progress,' but the reality is that it will degrade the quality of life for thousands of current residents while providing little public benefit.",
        "Infrastructure strain is my first concern. Our roads, sewers, and schools are already at capacity. Adding hundreds of new units without concurrent infrastructure investment means more traffic, longer emergency response times, and overcrowded classrooms. The developer's traffic study assumes ideal conditions and does not account for existing congestion. We have seen this pattern before: approve first, address infrastructure never.",
        "Affordable housing is the second concern. Rezoning to allow higher density is often sold as a way to create affordable housing. But the actual units built are overwhelmingly market-rate luxury apartments. Inclusionary zoning requirements, if they exist in this proposal, are typically too weak to matter — often 5% or 10% 'affordable' units in a building where the other 90% are unaffordable to the median local worker. That is not affordability. That is displacement with a fig leaf.",
        "School overcrowding is a direct consequence. Each new residential unit brings children. The school district has not been consulted on this rezoning and has no budget to build new classrooms. The burden falls on existing schools, existing teachers, and existing students.",
        "Finally, the process itself. These rezoning requests are often decided before the first public hearing. Developers meet with council members privately, make campaign contributions, and secure support before residents even know a proposal exists. That is not public participation. That is theater. I am asking this council to table this rezoning until a genuinely independent traffic study, school impact assessment, and infrastructure plan are completed and made public."
      ),
      closing:
        "Growth is not inherently good. Growth that strains our infrastructure, displaces our neighbors, and enriches out-of-town developers at our expense is bad growth. Vote no on this rezoning. Thank you.",
      keyFacts: [
        "Traffic studies submitted by developers typically assume ideal conditions and underestimate actual congestion increases.",
        "Inclusionary zoning requirements are often 5–10% 'affordable' units — insufficient to offset displacement.",
        "School districts are rarely consulted during rezoning despite being directly impacted by new residential development.",
        "Infrastructure improvements are frequently promised during rezoning approval but underfunded or delayed afterward.",
        "Rezoning often increases land values, which increases property taxes and displaces long-term residents.",
      ],
      suggestedQuestions: [
        "Has an independent — not developer-funded — traffic impact study been completed?",
        "What is the specific plan and budget for school expansion to accommodate children from these new units?",
        "How many units in this project will be affordable to a family earning the local median income?",
      ],
    },
    assertive: {
      opening:
        "My name is [YOUR NAME]. I have lived in this neighborhood for [X] years. And I am sick and tired of watching this council rubber-stamp every developer proposal that comes through the door while the rest of us deal with the consequences.",
      body: p(
        "Let's be honest about what this rezoning actually is. It is a handful of wealthy developers writing checks to politicians so they can build cheap, overpriced apartments on infrastructure that cannot handle it.",
        "The roads are already full. The schools are already overcrowded. The sewers already back up when it rains. And your solution is to add hundreds more units? That is not planning. That is negligence.",
        "And do not tell me this is about 'affordable housing.' I have read the proposal. The 'affordable' units are maybe 5% of the total. The rest are luxury rentals that nobody who grew up here can afford. This does not create affordable housing. It destroys it by driving up land values, raising property taxes, and pricing out the people who built this community.",
        "The schools. Have you talked to the school superintendent? Have you asked if they have classroom space for another hundred kids? No. Because you do not care. The developers do not care. And when the schools are bursting at the seams, you will blame the school district instead of your own vote.",
        "I am tired of the private meetings. I am tired of the campaign contributions from developers showing up on your FEC filings. I am tired of public hearings that are theater because the deal was already done in a back room.",
        "You want to know what the community wants? We want maintained roads. We want funded schools. We want our neighborhoods to stay neighborhoods, not investment vehicles for people who do not live here. Vote no on this rezoning. And if you vote yes, know that we are coming for your seat."
      ),
      closing:
        "This is our city. Not theirs. Vote no. Or find another job.",
      keyFacts: [
        "Developer traffic studies consistently underestimate real-world congestion.",
        "5–10% 'affordable' units does not offset displacement from 90%+ market-rate units.",
        "Rezoning increases land values, which raises property taxes and displaces existing residents.",
        "School districts are rarely consulted but bear the direct burden of overcrowding.",
        "Infrastructure promises made during rezoning are frequently underfunded or delayed.",
      ],
      suggestedQuestions: [
        "How much have the developers or their affiliates contributed to council members' campaigns in the past two years?",
        "Will you commit to voting no until the school district independently verifies it can absorb the new students?",
        "What percentage of units will be affordable to a family at 50% of Area Median Income — not 80% or 120%?",
      ],
    },
  },
  {
    id: "police-budget",
    icon: Shield,
    title: "Police Budget Accountability & Alternatives",
    subtitle: "Redirect funds to services that actually prevent crime",
    professional: {
      opening:
        "Good evening. My name is [YOUR NAME] and I live in [NEIGHBORHOOD]. I am here to ask this council to reject the proposed police budget increase and to reinvest those funds in proven crime prevention strategies.",
      body: p(
        "I want to be clear: this is not anti-police. This is pro-evidence. And the evidence overwhelmingly shows that simply hiring more police officers does not reduce crime as effectively as investing in community services.",
        "A comprehensive 2020 study published in the journal Science Advances analyzed 60 years of data and found that every dollar spent on social services and education reduced crime more than a dollar spent on policing. Mental health services, substance abuse treatment, youth employment programs, and stable housing all have stronger correlations with crime reduction than patrol officer headcount.",
        "Our city currently spends [X]% of its general fund on policing while spending [Y]% on mental health services. When someone is having a mental health crisis, we send armed officers. That is expensive, dangerous, and often tragic. Cities like Denver, Colorado, and Eugene, Oregon, have implemented civilian crisis response teams that handle mental health calls without police involvement — and the results are remarkable. Denver's STAR program reduced crime in its pilot district and cost a fraction of a police response.",
        "Police misconduct settlements are another hidden cost. Cities across the country pay millions annually in lawsuit settlements for police brutality, wrongful arrests, and civil rights violations. That money comes from the same budget that could fund after-school programs, homeless services, and job training.",
        "I am asking this council to freeze the police budget at current levels and redirect the proposed increase to: mental health crisis response teams; youth employment and mentorship programs; affordable housing and homelessness services; and violence interruption programs staffed by community members. These investments make us safer. The data proves it."
      ),
      closing:
        "Vote no on the police budget increase. Vote yes on evidence-based community investment. Thank you.",
      keyFacts: [
        "A 2020 Science Advances study found social services and education reduce crime more cost-effectively than policing.",
        "Denver's STAR program (civilian mental health response) reduced crime and cost significantly less per call than police response.",
        "Cities spend millions annually on police misconduct settlements that drain budgets from community services.",
        "Mental health crisis calls handled by civilians result in fewer injuries and fatalities than police responses.",
        "Violence interruption programs staffed by community members have reduced shootings by 40–60% in cities like Chicago and Baltimore.",
      ],
      suggestedQuestions: [
        "Has this council reviewed the 2020 Science Advances study comparing policing investment to social services investment?",
        "What percentage of 911 calls in our city are mental health or substance abuse related, and are civilians available to respond?",
        "How much has the city paid in police misconduct settlements in the past five years?",
      ],
    },
    assertive: {
      opening:
        "My name is [YOUR NAME]. I am a taxpayer in this city. And I am here to tell you that throwing more money at the police department is not public safety. It is a failed policy dressed up in a press release.",
      body: p(
        "Sixty years of data says the same thing: hiring more cops does not reduce crime as much as funding schools, mental health, housing, and jobs. That is not my opinion. That is peer-reviewed research published in Science Advances. If you actually care about safety, you follow the evidence.",
        "Right now, when someone in this city is having a mental health breakdown, we send a guy with a gun. That is insane. It is expensive. And people die. In Denver, they send a paramedic and a social worker. It costs less. It saves lives. It actually works. Why are we not doing that?",
        "Police misconduct settlements. How many millions of our dollars went to settle lawsuits because officers beat people, wrongfully arrested people, or killed people? That money could have built a youth center. Could have housed homeless families. Could have funded addiction treatment. Instead, it went to lawyers because this council refuses to hold bad cops accountable.",
        "Violence interruption works. Community members who know the streets, who have credibility, who can de-escalate conflicts before they turn deadly — they reduce shootings by half in some cities. But that requires funding community organizations, not buying military gear for the police department.",
        "You want to know what reduces crime? Stable housing. Good schools. Living-wage jobs. Mental health care. You know what does not reduce crime? A bigger police budget and a press conference.",
        "I am done with the excuses. I am done with the 'tough on crime' theater. Fund what works. Fund people. Vote no on the police budget increase."
      ),
      closing:
        "If you vote for this budget increase, you are voting against the evidence. You are voting against the community. And we will make sure every voter in this district knows it. Vote no.",
      keyFacts: [
        "60 years of data show social services and education reduce crime more effectively than increased policing.",
        "Denver's STAR program (civilian mental health response) costs less and produces better outcomes than police response.",
        "Police misconduct settlements drain millions from city budgets annually.",
        "Violence interruption programs reduce shootings by 40–60%.",
        "Mental health calls handled by civilians result in fewer deaths and injuries.",
      ],
      suggestedQuestions: [
        "How much of the police budget goes to equipment and overtime versus community engagement?",
        "Will you commit to funding a civilian mental health crisis team before approving any police hiring?",
        "How many officers in this department have sustained misconduct complaints, and are any currently on paid administrative leave?",
      ],
    },
  },
];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <nav className="flex items-center gap-1.5 text-white/50 text-sm mb-6">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <ChevronRight size={14} />
            <Link href="/local" className="hover:text-white/80">Local</Link>
            <ChevronRight size={14} />
            <span className="text-white/80">Speaking Templates</span>
          </nav>

          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center ring-1 ring-white/20 shrink-0">
              <Mic size={26} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Speaking Templates</h1>
              <p className="text-white/60 mt-2 text-lg">
                Pre-written, research-backed scripts for hot local issues. Use them as-is or adapt them.
              </p>
            </div>
          </div>

          <p className="text-white/70 leading-relaxed max-w-2xl text-base">
            Not everyone is a natural public speaker. These templates give you the facts, the structure,
            and the power to stand up at your city council meeting and be heard. Every template includes
            a <strong>Professional</strong> version and a <strong>First Amendment</strong> version.
            Choose what fits your style.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* ── Recording Reminder ── */}
        <AnimatedSection delay={0}>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
            <Video size={24} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900 mb-1">Record Everything</h3>
              <p className="text-sm text-amber-800 leading-relaxed">
                Before you speak, start recording on your phone. Keep it recording the entire meeting.
                If officials violate your rights or remove you illegally, that recording is your evidence
                for a <strong>42 U.S.C. § 1983</strong> lawsuit. Back up to cloud storage immediately after.
              </p>
            </div>
          </div>
        </AnimatedSection>

        {/* ── Template Cards ── */}
        {TEMPLATES.map((template, i) => (
          <AnimatedSection key={template.id} delay={i * 0.05}>
            <TemplateCard template={template} />
          </AnimatedSection>
        ))}

        {/* ── Grassroots CTA ── */}
        <AnimatedSection delay={0.25}>
          <section className="bg-[#1B2A4A] text-white rounded-2xl p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                <Users size={24} className="text-[#D69E2E]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">These Templates Are Starting Points</h2>
                <p className="text-white/70 leading-relaxed mb-4">
                  Customize them with your own story. Add your neighborhood name. Cite a specific
                  local example. The more personal you make it, the more powerful it becomes.
                </p>
                <p className="text-white/70 leading-relaxed">
                  And <strong>bring your neighbors</strong>. Ten people reading from coordinated
                  talking points is a movement. Fifty people is a mandate.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/local/rules"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 rounded-xl text-sm font-semibold hover:bg-white/15 transition-colors"
                  >
                    <BookOpen size={16} />
                    Rules for Speaking
                  </Link>
                  <Link
                    href="/local"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 rounded-xl text-sm font-semibold hover:bg-white/15 transition-colors"
                  >
                    Find Your Meeting <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </AnimatedSection>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Template Card
// ─────────────────────────────────────────────

function TemplateCard({ template }: { template: TemplateSet }) {
  const [tone, setTone] = useState<"professional" | "assertive">("professional");
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const current = tone === "professional" ? template.professional : template.assertive;

  const copyToClipboard = () => {
    const text = `${current.opening}\n\n${current.body}\n\n${current.closing}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <template.icon size={24} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[#1B2A4A]">{template.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{template.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => setTone("professional")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tone === "professional"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <BookOpen size={13} />
            Professional
          </button>
          <button
            onClick={() => setTone("assertive")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tone === "assertive"
                ? "bg-rose-100 text-rose-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <ShieldAlert size={13} />
            First Amendment
          </button>
          <button
            onClick={copyToClipboard}
            className="ml-auto inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Template body */}
      <div className="p-6 space-y-4">
        <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm text-gray-800 leading-relaxed">
          <p className="font-medium text-gray-900">{current.opening}</p>
          <p className="whitespace-pre-line">{current.body}</p>
          <p className="font-medium text-gray-900">{current.closing}</p>
        </div>

        {/* Expandable: Facts & Questions */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          {expanded ? "Hide" : "Show"} key facts & questions
          <ArrowRight
            size={14}
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </button>

        {expanded && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Key Facts to Cite
              </h4>
              <ul className="space-y-1.5">
                {current.keyFacts.map((fact, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    {fact}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Questions to Ask on the Record
              </h4>
              <ul className="space-y-1.5">
                {current.suggestedQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">
                      Q
                    </span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
