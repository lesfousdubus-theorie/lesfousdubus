import {
  CENTRAL_THESIS,
  THEORY_FOUNDATIONS,
  THEORY_GROUPS,
  THEORY_REFERENCES,
  type TheoryPoint,
} from "@/lib/theory-data";

/** Short thematic cards for the theory modal. */
export default function TheorySummary() {
  return (
    <article className="space-y-10">
      <header className="space-y-4 rounded-2xl border border-[#ffd23f]/45 border-l-4 border-l-[#ffd23f] bg-[#171a19] p-5 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#ffd23f]">L’idée centrale</p>
        <h3 className="text-xl font-black leading-tight text-white sm:text-2xl lg:text-[28px]">{CENTRAL_THESIS.title}</h3>
        <p className="font-semibold leading-7 text-[#ffd23f] sm:text-lg">{CENTRAL_THESIS.subtitle}</p>
        <p className="leading-7 text-[#f1f4f8] sm:text-base">{CENTRAL_THESIS.overview}</p>
        <p className="text-sm leading-6 text-white/80">{CENTRAL_THESIS.context}</p>
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
          <a key={group.id} href={"#modal-" + group.id}
            className="inline-flex min-h-11 items-center text-white/85 underline decoration-white/30 underline-offset-4 hover:text-[#ffd23f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd23f]">
            {group.title}
          </a>
        ))}
      </nav>

      <div className="space-y-10">
        {THEORY_GROUPS.map(group => (
          <section key={group.id} id={"modal-" + group.id} className="scroll-mt-6">
            <h4 className="mb-5 text-xl font-black leading-7 text-[#ffd23f] sm:text-2xl">{group.title}</h4>
            <div className="grid items-start gap-3 sm:grid-cols-2">
              <div className="space-y-3">
                {group.sections.slice(0, Math.ceil(group.sections.length / 2)).map(section => <PointCard key={section.id} section={section} />)}
              </div>
              <div className="space-y-3">
                {group.sections.slice(Math.ceil(group.sections.length / 2)).map(section => <PointCard key={section.id} section={section} />)}
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="border-t border-white/15 pt-5 text-sm text-white/75">
        <p>Sources</p>
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
      <div className="mt-3 border-t border-white/20 pt-1">
        <p className="mt-3 text-sm leading-7 text-[#e4e9f0] sm:text-[15px]">{section.summary}</p>
        {section.sources && section.sources.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-4">
            {section.sources.map(source => (
              <a key={source.url} href={source.url} aria-label={source.label + " : " + section.title} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-xs font-semibold text-[#ffd23f] underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd23f]">{source.label} ↗</a>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
