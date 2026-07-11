import React from 'react';

// Saras brand lockup — node-cluster mark + "saras" wordmark, rendered as inline
// SVG (self-contained, no external asset) in the Saras brand blue.
export default function SarasLogo() {
  return (
    <svg className="saras-logo" viewBox="0 0 172 42" role="img" aria-label="Saras">
      <g fill="#3f3ce8">
        <circle cx="27" cy="8" r="6.2" />
        <circle cx="13.5" cy="13" r="4.6" />
        <circle cx="24" cy="21" r="5" />
        <circle cx="13" cy="29" r="4.6" />
        <circle cx="26" cy="33.5" r="6.2" />
        <circle cx="7.5" cy="20" r="2.6" />
        <circle cx="33" cy="26" r="2.6" />
      </g>
      <text
        x="48"
        y="30"
        fontFamily="Inter, -apple-system, sans-serif"
        fontSize="27"
        fontWeight="800"
        letterSpacing="-0.6"
        fill="#3f3ce8"
      >
        saras
      </text>
    </svg>
  );
}
