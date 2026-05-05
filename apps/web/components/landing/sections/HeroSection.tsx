"use client";

import React from "react";

const titleWords = ["Scout", "every", "Solana", "launch.", "Enter", "with", "conviction."];

const descriptionWords = [
  "Jaguar",
  "watches",
  "every",
  "new",
  "pair,",
  "scores",
  "conviction",
  "minute",
  "by",
  "minute,",
  "and",
  "tells",
  "you",
  "—",
  "with",
  "evidence",
  "—",
  "whether",
  "to",
  "ignore,",
  "watch,",
  "or",
  "enter.",
];

function RevealText({ as: Component, words, className, startDelay }: {
  as: React.ElementType;
  words: string[];
  className?: string;
  startDelay: number;
}) {
  return (
    <Component className={className} data-aura-component-name="RevealText">
      {words.map((word, index) => (
        <React.Fragment key={`${word}-${index}`}>
          {index > 0 && " "}
          <span className="inline-block overflow-hidden align-bottom" data-aura-component-name="RevealText">
            <span
              className="inline-block origin-top-left opacity-0 animate-reveal-word"
              data-aura-component-name="RevealText"
              style={{ animationDelay: `${startDelay + index * 0.04}s` }}
            >
              {word}
            </span>
          </span>
        </React.Fragment>
      ))}
    </Component>
  );
}

function HeroFrame() {
  const cornerClassName = "absolute h-[5px] w-[5px] border border-slate-300 bg-slate-50";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 flex w-full justify-center overflow-hidden"
      data-aura-component-name="Hero"
    >
      <div
        className="relative h-full w-full max-w-screen-2xl border-x border-slate-200/50"
        data-aura-component-name="Hero"
      >
        <div className={`${cornerClassName} -left-[2.5px] top-0`} data-aura-component-name="Hero" />
        <div className={`${cornerClassName} -right-[2.5px] top-0`} data-aura-component-name="Hero" />
        <div className={`${cornerClassName} -left-[2.5px] bottom-0`} data-aura-component-name="Hero" />
        <div className={`${cornerClassName} -right-[2.5px] bottom-0`} data-aura-component-name="Hero" />
      </div>
    </div>
  );
}

function HeroWaveSvg() {
  return (
    <svg
      className="absolute left-1/2 top-1/2 h-[120vh] w-[200%] -translate-x-1/2 -translate-y-1/2"
      viewBox="0 0 2880 800"
      preserveAspectRatio="none"
      data-aura-component-name="Hero"
    >
      <defs>
        <linearGradient id="wave-grad-1" x1="0%" y1="0%" x2="100%" y2="0%" data-aura-component-name="Hero">
          <stop offset="0%" stopColor="#14593a" stopOpacity="0.25" data-aura-component-name="Hero" />
          <stop offset="50%" stopColor="#2ea86b" stopOpacity="0.28" data-aura-component-name="Hero" />
          <stop offset="100%" stopColor="#14593a" stopOpacity="0.25" data-aura-component-name="Hero" />
        </linearGradient>
        <linearGradient id="wave-grad-2" x1="0%" y1="0%" x2="100%" y2="0%" data-aura-component-name="Hero">
          <stop offset="0%" stopColor="#1e7a52" stopOpacity="0.15" data-aura-component-name="Hero" />
          <stop offset="50%" stopColor="#2ea86b" stopOpacity="0.18" data-aura-component-name="Hero" />
          <stop offset="100%" stopColor="#1e7a52" stopOpacity="0.15" data-aura-component-name="Hero" />
        </linearGradient>
        <linearGradient id="wave-grad-3" x1="0%" y1="0%" x2="100%" y2="0%" data-aura-component-name="Hero">
          <stop offset="0%" stopColor="#14593a" stopOpacity="0.28" data-aura-component-name="Hero" />
          <stop offset="50%" stopColor="#2ea86b" stopOpacity="0.3" data-aura-component-name="Hero" />
          <stop offset="100%" stopColor="#14593a" stopOpacity="0.28" data-aura-component-name="Hero" />
        </linearGradient>
      </defs>
      <path
        className="animate-wave-1"
        fill="url(#wave-grad-1)"
        d="M 0 400 C 240 200, 480 200, 720 400 C 960 600, 1200 600, 1440 400 C 1680 200, 1920 200, 2160 400 C 2400 600, 2640 600, 2880 400 L 2880 800 L 0 800 Z"
        data-aura-component-name="Hero"
      />
      <path
        className="animate-wave-2"
        fill="url(#wave-grad-2)"
        d="M 0 500 C 240 700, 480 700, 720 500 C 960 300, 1200 300, 1440 500 C 1680 700, 1920 700, 2160 500 C 2400 300, 2640 300, 2880 500 L 2880 800 L 0 800 Z"
        data-aura-component-name="Hero"
      />
      <path
        className="animate-wave-3"
        fill="url(#wave-grad-3)"
        d="M 0 600 C 240 450, 480 450, 720 600 C 960 750, 1200 750, 1440 600 C 1680 450, 1920 450, 2160 600 C 2400 750, 2640 750, 2880 600 L 2880 800 L 0 800 Z"
        data-aura-component-name="Hero"
      />
    </svg>
  );
}

function HeroBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 flex justify-center overflow-hidden"
      data-aura-component-name="Hero"
    >
      <div className="relative h-full w-full overflow-hidden" data-aura-component-name="Hero">
        <img
          src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/d14dc069-558a-4c51-8aad-5cc237f9b61d_1600w.jpg"
          className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-multiply animate-aura"
          alt="Abstract Wave"
          data-aura-component-name="Hero"
        />
        <div
          className="absolute inset-0 flex items-center justify-center opacity-80 mix-blend-multiply"
          data-aura-component-name="Hero"
        >
          <HeroWaveSvg />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-transparent to-slate-50" data-aura-component-name="Hero" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/60 via-transparent to-slate-50" data-aura-component-name="Hero" />
        <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]" data-aura-component-name="Hero" />
      </div>
    </div>
  );
}

function PlatformMetricBadge() {
  return (
    <div
      className="mb-6 flex items-center gap-2 rounded-full border border-[#cfe8d9] bg-white/80 px-3 py-1.5 text-xs font-normal text-slate-600 shadow-sm backdrop-blur-md animate-fade-up-delayed"
      data-aura-component-name="Hero"
      style={{ animationDelay: "0.1s" }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[#2ea86b]" />
      <span>Powered by</span>
      <span className="font-medium tracking-tight text-slate-900" data-aura-component-name="Hero">
        GoldRush
      </span>
      <span className="text-slate-300">·</span>
      <span className="font-medium tracking-tight text-slate-900" data-aura-component-name="Hero">
        Solana
      </span>
    </div>
  );
}

const FRAME_W = 1440;
const FRAME_H = 1050;

function DashboardPreview() {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.7);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) {
      return undefined;
    }
    const update = () => {
      const w = el.clientWidth;
      setScale(Math.max(0.3, Math.min(1, w / FRAME_W)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto mt-20 w-full max-w-6xl animate-fade-up-delayed lg:mt-24"
      style={{ animationDelay: "0.8s" }}
      data-aura-component-name="Hero"
    >
      <div
        className="pointer-events-none absolute -inset-x-6 -bottom-10 -top-6 -z-10 rounded-[32px] bg-gradient-to-br from-[#2ea86b]/15 via-[#14593a]/10 to-[#1e7a52]/15 blur-2xl"
        data-aura-component-name="Hero"
      />
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_30px_80px_-20px_rgba(46,168,107,0.28)] ring-1 ring-white/60"
        style={{ height: FRAME_H * scale }}
        data-aura-component-name="Hero"
      >
        <div
          className="flex h-9 items-center gap-1.5 border-b border-slate-200/70 bg-slate-50/80 px-4"
          data-aura-component-name="Hero"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="ml-3 text-[11px] font-medium tracking-tight text-slate-400">
            app.jaguar.xyz/dashboard
          </span>
        </div>
        <iframe
          src="/dashboard"
          title="Jaguar dashboard preview"
          loading="lazy"
          className="pointer-events-none block origin-top-left border-0 bg-white"
          style={{
            width: FRAME_W,
            height: FRAME_H,
            transform: `scale(${scale})`,
          }}
          data-aura-component-name="Hero"
        />
      </div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section
      className="relative flex w-full flex-col items-center overflow-hidden bg-slate-50 px-6 pb-24 pt-36 font-sans text-slate-900 lg:px-12 lg:pt-44"
      data-aura-component-name="Hero"
    >
      <HeroFrame />
      <HeroBackdrop />
      <div
        className="relative z-20 flex w-full max-w-screen-2xl flex-col items-center"
        data-aura-component-name="Hero"
      >
        <div className="flex w-full flex-col items-center text-center" data-aura-component-name="Hero">
          <PlatformMetricBadge />
          <RevealText
            as="h1"
            words={titleWords}
            startDelay={0.2}
            className="mx-auto mb-6 max-w-4xl text-5xl font-normal leading-[1.05] tracking-tight text-slate-900 md:text-6xl lg:text-[4.25rem] xl:text-[4.75rem]"
          />
          <RevealText
            as="p"
            words={descriptionWords}
            startDelay={0.4}
            className="mx-auto max-w-2xl text-lg font-light leading-snug tracking-tight text-slate-500 md:text-xl lg:text-[1.4rem]"
          />
        </div>
        <DashboardPreview />
      </div>
    </section>
  );
}
