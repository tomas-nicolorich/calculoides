interface LogoProps {
  className?: string;
}

// Ledger-bar C: 13 tally bars on a 300deg arc (60deg gap facing right),
// one wider accent bar at the bottom breaking to brand-income.
export function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      data-testid="brand-mark"
    >
      <g transform="rotate(120 50 50)">
        <rect
          x="46.5"
          y="16"
          width="7"
          height="10"
          rx="3"
          className="fill-brand-balance"
        />
      </g>
      <g transform="rotate(145 50 50)">
        <rect
          x="46.5"
          y="12"
          width="7"
          height="14"
          rx="3"
          className="fill-brand-balance"
        />
      </g>
      <g transform="rotate(170 50 50)">
        <rect
          x="46.5"
          y="14"
          width="7"
          height="12"
          rx="3"
          className="fill-brand-balance"
        />
      </g>
      <g transform="rotate(195 50 50)">
        <rect
          x="46.5"
          y="10"
          width="7"
          height="16"
          rx="3"
          className="fill-brand-balance"
        />
      </g>
      <g transform="rotate(220 50 50)">
        <rect
          x="46.5"
          y="13"
          width="7"
          height="13"
          rx="3"
          className="fill-brand-balance"
        />
      </g>
      <g transform="rotate(245 50 50)">
        <rect
          x="46.5"
          y="8"
          width="7"
          height="18"
          rx="3"
          className="fill-brand-balance"
        />
      </g>
      <g transform="rotate(270 50 50)">
        <rect
          x="45.5"
          y="4"
          width="9"
          height="22"
          rx="4"
          className="fill-brand-income"
        />
      </g>
      <g transform="rotate(295 50 50)">
        <rect
          x="46.5"
          y="9"
          width="7"
          height="17"
          rx="3"
          className="fill-brand-balance"
        />
      </g>
      <g transform="rotate(320 50 50)">
        <rect
          x="46.5"
          y="13"
          width="7"
          height="13"
          rx="3"
          className="fill-brand-balance"
        />
      </g>
      <g transform="rotate(345 50 50)">
        <rect
          x="46.5"
          y="11"
          width="7"
          height="15"
          rx="3"
          className="fill-brand-balance"
        />
      </g>
      <g transform="rotate(10 50 50)">
        <rect
          x="46.5"
          y="15"
          width="7"
          height="11"
          rx="3"
          className="fill-brand-balance"
        />
      </g>
      <g transform="rotate(35 50 50)">
        <rect
          x="46.5"
          y="12"
          width="7"
          height="14"
          rx="3"
          className="fill-brand-balance"
        />
      </g>
      <g transform="rotate(60 50 50)">
        <rect
          x="46.5"
          y="14"
          width="7"
          height="12"
          rx="3"
          className="fill-brand-balance"
        />
      </g>
    </svg>
  );
}
