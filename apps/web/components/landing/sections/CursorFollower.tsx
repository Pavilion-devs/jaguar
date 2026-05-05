import React from "react";

export default function CursorFollower() {
  return (
    <div className="pointer-events-none fixed z-[9999] transition-transform duration-75 ease-out" data-aura-component-name="App" style={{left: 0, top: 0, transform: 'scale(1)'}}>
      <iconify-icon icon="solar:star-shine-bold" className="text-purple-500 text-2xl" data-aura-component-name="App" />
    </div>
  );
}
