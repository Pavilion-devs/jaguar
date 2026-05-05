import React from "react";
import CursorFollower from "./sections/CursorFollower";
import HeroSection from "./sections/HeroSection";
import LogoStrip from "./sections/LogoStrip";
import HowItWorksSection from "./sections/HowItWorksSection";
import IncentiveTemplatesSection from "./sections/IncentiveTemplatesSection";

export default function MainContent() {
  return (
    <main className="flex-grow" data-aura-component-name="App">
      <CursorFollower />
      <HeroSection />
      <LogoStrip />
      <HowItWorksSection />
      <IncentiveTemplatesSection />
    </main>
  );
}
