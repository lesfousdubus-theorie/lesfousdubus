import {
  CENTRAL_THESIS,
  THEORY_FOUNDATIONS,
  THEORY_GROUPS,
  THEORY_REFERENCES,
  type TheoryPoint,
} from "@/lib/theory-data";
import { ExternalArrowIcon } from "../ui/BusIcons";

/** Short thematic cards for the theory modal. */
export default function TheorySummary() {
  return (
    <article className="space-y-10">
      <header className="space-y-4 rounded-2xl border border-[#ffd23f]/40 border-l-4 border-l-[#ffd23f] bg-gradient-to-br from-[#10265c]/90 to-[#0c1b3a] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.3)] sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#ffd23f]">L’idée centrale</p>
        <h3 className="text-xl font-black leading-tight text-white sm:text-2xl lg:text-[28px]">{CENTRAL_THESIS.title}</h3>
        <p className="font-semibold leading-7 text-[#ffd23f] sm:text-lg">{CENTRAL_THESIS.subtitle}</p>
        <p className="leading-7 text-[#dce7ff] sm:text-base">{CENTRAL_THESIS.overview}</p>
        <p className="text-sm leading-6 text-[#b6c7eb]">{CENTRAL_THESIS.context}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {THEORY_FOUNDATIONS.map(item => (
          <div key={item.title} className="rounded-xl border border-white/15 bg-[#0c1b3a] p-5">
            <p className="font-bold leading-6 text-[#ffd23f]">{item.title}</p>
            <p className="mt-3 text-sm leading-7 text-[#dce7ff]">{item.text}</p>
          </div>
        ))}
      </div>

      <nav aria-label="Les thèmes de la théorie" className="flex flex-wrap gap-x-5 gap-y-1 border-y border-white/10 py-3 text-sm">
        {THEORY_GROUPS.map(group => (
          <a
            key={group.id}
            href={"#modal-" + group.id}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-sm font-medium text-[#dce7ff] underline decoration-[#ffd23f]/45 underline-offset-4 transition-colors hover:text-[#ffd23f] hover:decoration-[#ffd23f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] motion-reduce:transition-none"
          >
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

      <div className="border-t border-white/10 pt-5 text-sm text-[#b6c7eb]">
        <p className="font-semibold">Sources</p>
        <div className="mt-1 flex flex-wrap gap-x-5">
          {[THEORY_REFERENCES.video, THEORY_REFERENCES.threads, THEORY_REFERENCES.mechanism].map(source => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm font-medium text-[#ffd23f] underline underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] motion-reduce:transition-none"
            >
              <span>{source.label}</span>
              <ExternalArrowIcon className="h-3.5 w-3.5 shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}

function PointCard({ section }: { section: TheoryPoint }) {
  return (
    <details className="group rounded-xl border border-white/15 bg-[#0c1b3a] p-4 transition-colors hover:border-[#ffd23f]/45 [&[open]]:border-[#ffd23f]/55 [&[open]]:bg-[#10265c]/80 motion-reduce:transition-none sm:p-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-start gap-3 rounded-lg select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/15 bg-[#040b18] text-lg transition-colors group-open:border-[#ffd23f]/40 group-open:bg-[#07142b] motion-reduce:transition-none">
          {section.icon}
        </span>
        <span className="min-w-0 flex-1 self-center text-sm font-bold leading-snug text-white transition-colors group-open:text-[#ffd23f] motion-reduce:transition-none">
          {section.title}
        </span>
        <svg
          aria-hidden="true"
          focusable="false"
          className="mt-2.5 h-4 w-4 shrink-0 text-[#ffd23f] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="mt-3 border-t border-white/15 pt-1">
        <p className="mt-3 text-sm leading-7 text-[#dce7ff] sm:text-[15px]">{section.summary}</p>
        {section.sources && section.sources.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-4">
            {section.sources.map(source => (
              <a
                key={source.url}
                href={source.url}
                aria-label={source.label + " : " + section.title}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm text-xs font-semibold text-[#ffd23f] underline underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd23f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b] motion-reduce:transition-none"
              >
                <span>{source.label}</span>
                <ExternalArrowIcon className="h-3.5 w-3.5 shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
