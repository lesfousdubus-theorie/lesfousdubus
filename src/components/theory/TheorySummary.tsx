import {
  CENTRAL_THESIS,
  THEORY_FOUNDATIONS,
  THEORY_GROUPS,
  THEORY_OPEN_QUESTIONS,
  THEORY_REFERENCES,
  type TheoryPoint,
} from "@/lib/theory-data";
import { THEORY_VIDEO_URL } from "@/lib/theory-video";

/** Native disclosures work in the modal and on the server-rendered reading page. */
export default function TheorySummary({ mode }: { mode: "modal" | "reading" }) {
  const reading = mode === "reading";
  const Title = reading ? "h1" : "h3";
  const GroupTitle = reading ? "h2" : "h4";

  return (
    <article className="space-y-10">
      <header className={reading ? "space-y-5" : "space-y-4 rounded-2xl border border-[#ffd23f]/45 border-l-4 border-l-[#ffd23f] bg-[#171a19] p-5 sm:p-7"}>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#ffd23f]">L’idée centrale</p>
        <Title className={reading ? "text-3xl font-black leading-tight text-[#ffd23f] [text-wrap:balance] sm:text-5xl" : "text-xl font-black leading-tight text-white sm:text-2xl lg:text-[28px]"}>
          {CENTRAL_THESIS.title}
        </Title>
        <p className="font-semibold leading-7 text-[#ffd23f] sm:text-lg">{CENTRAL_THESIS.subtitle}</p>
        <p className="leading-7 text-[#f1f4f8] sm:text-base">{CENTRAL_THESIS.overview}</p>
        <p className="text-sm leading-6 text-white/80">{CENTRAL_THESIS.context}</p>
        <p className="text-xs leading-6 text-white/75">{CENTRAL_THESIS.attribution}</p>
        <a href={reading ? THEORY_VIDEO_URL : "/theorie"} target={reading ? "_blank" : undefined} rel={reading ? "noopener noreferrer" : undefined}
          className="inline-flex min-h-11 items-center text-sm font-bold text-[#ffd23f] underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd23f]">
          {reading ? "Regarder la vidéo complète ↗" : "Lire la théorie sur une page dédiée ↗"}
        </a>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {THEORY_FOUNDATIONS.map(item => (
          <div key={item.title} className="rounded-xl border border-white/20 bg-[#070c16] p-5">
            <p className="font-bold leading-6 text-[#ffd23f]">{item.title}</p>
            <p className="mt-3 text-sm leading-7 text-[#eef1f5]">{item.text}</p>
          </div>
        ))}
      </div>

      <nav aria-label="Les thèmes de la théorie" className="flex flex-wrap gap-x-5 gap-y-1 border-y border-white/15 py-3 text-sm">
        {THEORY_GROUPS.map(group => (
          <a key={group.id} href={`#${reading ? "lecture" : "modal"}-${group.id}`}
            className="inline-flex min-h-11 items-center text-white/85 underline decoration-white/30 underline-offset-4 hover:text-[#ffd23f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd23f]">
            {group.title}
          </a>
        ))}
      </nav>

      <div id={reading ? "theory-chapters" : undefined} className="space-y-10">
        {THEORY_GROUPS.map(group => (
          <section key={group.id} id={`${reading ? "lecture" : "modal"}-${group.id}`} className="scroll-mt-6">
            <GroupTitle className="mb-5 text-xl font-black leading-7 text-[#ffd23f] sm:text-2xl">{group.title}</GroupTitle>
            {reading ? (
              <div className="space-y-7">
                {group.sections.map(section => (
                  <section key={section.id}>
                    <h3 className="text-lg font-bold leading-7 text-white">{section.title}</h3>
                    <PointBody section={section} />
                  </section>
                ))}
              </div>
            ) : (
              <div className="grid items-start gap-3 sm:grid-cols-2">
                <div className="space-y-3">
                  {group.sections.slice(0, Math.ceil(group.sections.length / 2)).map(section => <PointCard key={section.id} section={section} />)}
                </div>
                <div className="space-y-3">
                  {group.sections.slice(Math.ceil(group.sections.length / 2)).map(section => <PointCard key={section.id} section={section} />)}
                </div>
              </div>
            )}
          </section>
        ))}
      </div>

      <aside className="rounded-xl border border-[#7dd3fc]/30 bg-[#0d2638] p-5 sm:p-6">
        <GroupTitle className="text-lg font-bold text-[#a5e4ff]">{THEORY_OPEN_QUESTIONS.title}</GroupTitle>
        <p className="mt-3 text-sm leading-7 text-[#e8f5ff]">{THEORY_OPEN_QUESTIONS.text}</p>
      </aside>

      <div className="border-t border-white/15 pt-5 text-sm text-white/75">
        <p>Pour approfondir les arguments et les pistes :</p>
        <div className="mt-1 flex flex-wrap gap-x-5">
          {[THEORY_REFERENCES.video, THEORY_REFERENCES.threads, THEORY_REFERENCES.mechanism].map(source => (
            <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-[#ffd23f] underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd23f]">{source.label} ↗</a>
          ))}
        </div>
      </div>
    </article>
  );
}

function PointCard({ section }: { section: TheoryPoint }) {
  return (
    <details className="group rounded-xl border border-white/20 bg-[#101827] p-4 transition hover:border-white/35 open:border-[#ffd23f]/60 open:bg-[#1c1d19] sm:p-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-start gap-3 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b1220]">
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/20 bg-[#050912] text-lg">{section.icon}</span>
        <span className="min-w-0 flex-1 text-sm font-bold leading-snug text-white group-open:text-[#ffd23f]">{section.title}</span>
        <span aria-hidden="true" className="mt-2 text-sm text-[#ffd23f] transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="mt-3 border-t border-white/20 pt-1"><PointBody section={section} /></div>
    </details>
  );
}

function PointBody({ section }: { section: TheoryPoint }) {
  const sources = [
    ...(section.sourceSeconds === undefined ? [] : [{ label: "Approfondir dans la vidéo", url: `${THEORY_VIDEO_URL}&t=${section.sourceSeconds}s` }]),
    ...(section.sources ?? []),
  ];
  return (
    <>
      <p className="mt-3 text-sm leading-7 text-[#e4e9f0] sm:text-[15px]">{section.summary}</p>
      {section.note && <p className="mt-2 text-xs leading-6 text-[#a5e4ff]">{section.note}</p>}
      <div className="mt-1 flex flex-wrap gap-x-4">
        {sources.map(source => (
          <a key={source.url} href={source.url} aria-label={`${source.label} : ${section.title}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-xs font-semibold text-[#ffd23f] underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd23f]">{source.label} ↗</a>
        ))}
      </div>
    </>
  );
}
