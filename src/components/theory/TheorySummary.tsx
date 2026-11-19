"use client";

import { useCallback, useRef, useState } from "react";
import {
  CENTRAL_THESIS,
  THEORY_FOUNDATIONS,
  THEORY_GROUPS,
  THEORY_REFERENCES,
  type TheoryPoint,
} from "@/lib/theory-data";
import { ChevronDownIcon, ExternalArrowIcon } from "../ui/BusIcons";

function getOrderedSections(sections: readonly TheoryPoint[]): TheoryPoint[] {
  const firstHalf = sections.slice(0, Math.ceil(sections.length / 2));
  const secondHalf = sections.slice(Math.ceil(sections.length / 2));
  return [...firstHalf, ...secondHalf];
}

/** Short thematic cards for the theory modal. */
export default function TheorySummary() {
  const groupsRef = useRef<HTMLDivElement>(null);
  const [allExpanded, setAllExpanded] = useState(false);

  const syncAllExpanded = useCallback(() => {
    const container = groupsRef.current;
    if (!container) return;
    const details = Array.from(container.querySelectorAll("details"));
    setAllExpanded(details.length > 0 && details.every((item) => item.open));
  }, []);

  const toggleAll = useCallback(() => {
    const container = groupsRef.current;
    if (!container) return;
    const details = Array.from(container.querySelectorAll("details"));
    const nextOpen = !details.every((item) => item.open);
    for (const item of details) {
      item.open = nextOpen;
    }
    setAllExpanded(nextOpen);
  }, []);

  return (
    <article className="space-y-10">
      <header className="space-y-4 rounded-2xl border border-[#a78bfa]/40 border-l-4 border-l-[#a78bfa] bg-gradient-to-br from-[#1e2e70]/90 to-[#141f4b] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.3)] sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#a78bfa]">L’idée centrale</p>
        <h3 className="text-xl font-black leading-tight text-white sm:text-2xl lg:text-[28px]">{CENTRAL_THESIS.title}</h3>
        <p className="font-semibold leading-7 text-[#a78bfa] sm:text-lg">{CENTRAL_THESIS.subtitle}</p>
        <p className="leading-7 text-[#e2e8ff] sm:text-base">{CENTRAL_THESIS.overview}</p>
        <p className="text-sm leading-6 text-[#b6c1ee]">{CENTRAL_THESIS.context}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {THEORY_FOUNDATIONS.map(item => (
          <div key={item.title} className="rounded-xl border border-white/15 bg-[#141f4b] p-5">
            <p className="font-bold leading-6 text-[#a78bfa]">{item.title}</p>
            <p className="mt-3 text-sm leading-7 text-[#e2e8ff]">{item.text}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-y border-white/10 py-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Les thèmes de la théorie" className="flex min-w-0 flex-1 flex-wrap gap-x-5 gap-y-1 text-sm">
          {THEORY_GROUPS.map(group => (
            <a
              key={group.id}
              href={"#modal-" + group.id}
              onClick={(event) => {
                event.preventDefault();
                const behavior = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
                document.getElementById(`modal-${group.id}`)?.scrollIntoView({ behavior, block: "start" });
              }}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-sm font-medium text-[#e2e8ff] underline decoration-[#a78bfa]/45 underline-offset-4 transition-colors hover:text-[#a78bfa] hover:decoration-[#a78bfa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1433] motion-reduce:transition-none"
            >
              {group.title}
            </a>
          ))}
        </nav>
        <button
          type="button"
          onClick={toggleAll}
          aria-pressed={allExpanded}
          className="bus-secondary inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center self-start rounded-lg border border-white/20 bg-[#141f4b] px-3.5 py-2 text-xs font-bold text-[#a78bfa] transition-colors hover:border-[#a78bfa]/60 hover:bg-[#1e2e70] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1433] active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none sm:self-center"
        >
          {allExpanded ? "Tout replier" : "Tout déplier"}
        </button>
      </div>

      <div ref={groupsRef} className="space-y-10">
        {THEORY_GROUPS.map(group => {
          const orderedSections = getOrderedSections(group.sections);
          const leftSections = orderedSections.filter((_, index) => index % 2 === 0);
          const rightSections = orderedSections.filter((_, index) => index % 2 === 1);
          return (
            <section key={group.id} id={"modal-" + group.id} className="scroll-mt-6">
              <h4 className="mb-5 text-xl font-black leading-7 text-[#a78bfa] sm:text-2xl">{group.title}</h4>
              <div className="grid items-start gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-3">
                  {leftSections.map(section => (
                    <PointCard key={section.id} section={section} onToggle={syncAllExpanded} />
                  ))}
                </div>
                <div className="flex flex-col gap-3">
                  {rightSections.map(section => (
                    <PointCard key={section.id} section={section} onToggle={syncAllExpanded} />
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="border-t border-white/10 pt-5 text-sm text-[#b6c1ee]">
        <p className="font-semibold">Sources</p>
        <div className="mt-1 flex flex-wrap gap-x-5">
          {[THEORY_REFERENCES.video, THEORY_REFERENCES.threads, THEORY_REFERENCES.mechanism].map(source => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm font-medium text-[#a78bfa] underline underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1433] motion-reduce:transition-none"
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

function PointCard({ section, onToggle }: { section: TheoryPoint; onToggle: () => void }) {
  return (
    <details
      onToggle={onToggle}
      className="group rounded-xl border border-white/15 bg-[#141f4b] p-4 transition-colors hover:border-[#a78bfa]/45 [&[open]]:border-[#a78bfa]/55 [&[open]]:bg-[#1e2e70]/80 motion-reduce:transition-none sm:p-5"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-start gap-3 rounded-lg select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141f4b] [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/15 bg-[#070e26] text-lg transition-colors group-open:border-[#a78bfa]/40 group-open:bg-[#0b1433] motion-reduce:transition-none">
          {section.icon}
        </span>
        <span className="min-w-0 flex-1 self-center text-sm font-bold leading-snug text-white transition-colors group-open:text-[#a78bfa] motion-reduce:transition-none">
          {section.title}
        </span>
        <ChevronDownIcon className="mt-2.5 h-4 w-4 shrink-0 text-[#a78bfa] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="mt-3 border-t border-white/15 pt-1">
        <p className="mt-3 text-sm leading-7 text-[#e2e8ff] sm:text-[15px]">{section.summary}</p>
        {section.sources && section.sources.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-4">
            {section.sources.map(source => (
              <a
                key={source.url}
                href={source.url}
                aria-label={source.label + " : " + section.title}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm text-xs font-semibold text-[#a78bfa] underline underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141f4b] motion-reduce:transition-none"
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
