import React from "react";

const guideLinks = [
  "How Jaguar scores conviction in real time",
  "Persona guide: Degen vs Analyst vs Watcher",
  "Understanding the signal model",
];

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <iconify-icon
      icon="solar:arrow-right-linear"
      width={16}
      className={className}
      data-aura-component-name="CaseStudies"
    />
  );
}

function FeaturedStoryCard() {
  return (
    <a
      href="#"
      className="group relative block aspect-square overflow-hidden rounded-2xl bg-[#14593a] transition-shadow hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2ea86b] focus-visible:ring-offset-2 md:aspect-[4/3]"
      data-aura-component-name="CaseStudyCard"
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#2ea86b]/40 to-[#14593a] opacity-90"
        data-aura-component-name="CaseStudyCard"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(46,168,107,0.6),transparent_60%)]" />
      <div className="absolute inset-0 z-10 flex flex-col justify-end p-8 text-white" data-aura-component-name="CaseStudyCard">
        <div className="mb-4 flex items-center gap-2">
          <iconify-icon icon="solar:chart-2-bold" className="text-[#cfe8d9] text-2xl" />
          <span className="text-[13px] font-medium uppercase tracking-[0.18em] text-[#cfe8d9]">
            Case study
          </span>
        </div>
        <h4 className="mb-4 text-xl font-medium leading-tight" data-aura-component-name="CaseStudyCard">
          How early Jaguar users found 5 ENTER signals in their first week.
        </h4>
        <div
          className="flex items-center gap-1 text-sm font-medium transition-colors group-hover:text-[#cfe8d9]"
          data-aura-component-name="CaseStudyCard"
        >
          Read the story
          <ArrowIcon className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </a>
  );
}

function ResourceCard() {
  return (
    <div
      className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-[#f8f9fa] p-8"
      data-aura-component-name="CaseStudies"
    >
      <div>
        <div
          className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg border border-[#cfe8d9] bg-white shadow-sm"
          data-aura-component-name="CaseStudies"
        >
          <iconify-icon
            icon="solar:document-text-bold"
            width={24}
            className="text-[#14593a]"
            data-aura-component-name="CaseStudies"
          />
        </div>
        <h4 className="mb-4 text-xl font-medium text-[#0a2540]" data-aura-component-name="CaseStudies">
          Learn how Jaguar works
        </h4>
        <p className="mb-8 text-[#424770]" data-aura-component-name="CaseStudies">
          Understand the scoring model, persona system, and signal logic — everything you need to trade Solana launches with confidence.
        </p>
      </div>
      <div className="space-y-4 border-t border-gray-200 pt-6" data-aura-component-name="CaseStudies">
        {guideLinks.map((label) => (
          <a
            key={label}
            href="#"
            className="group flex min-h-10 items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2ea86b] focus-visible:ring-offset-2"
            data-aura-component-name="CaseStudies"
          >
            <span
              className="text-sm font-medium text-[#0a2540] transition-colors group-hover:text-[#14593a]"
              data-aura-component-name="CaseStudies"
            >
              {label}
            </span>
            <ArrowIcon className="text-gray-400 transition-all group-hover:translate-x-1 group-hover:text-[#14593a]" />
          </a>
        ))}
      </div>
    </div>
  );
}

export default function CaseStudies() {
  return (
    <section className="bg-white px-24 py-24" data-aura-component-name="CaseStudies">
      <div className="mx-auto max-w-[1200px]" data-aura-component-name="CaseStudies">
        <h2 className="mb-10 text-2xl font-medium tracking-tight text-[#0a2540]" data-aura-component-name="CaseStudies">
          Built on evidence
        </h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2" data-aura-component-name="CaseStudies">
          <FeaturedStoryCard />
          <ResourceCard />
        </div>
      </div>
    </section>
  );
}
