export function LoadingSpinner({ size = 180, blur = "none" }: { size?: number, blur?: string }) {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-${blur} bg-white/40`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150" width={size} height={size}>
        <path
          fill="none"
          stroke="#00AAB0"
          strokeWidth="17"
          strokeLinecap="round"
          strokeDasharray="300 385"
          strokeDashoffset="0"
          d="M275 75c0 31-27 50-50 50-58 0-92-100-150-100-28 0-50 22-50 50s23 50 50 50c58 0 92-100 150-100 24 0 50 19 50 50Z"
        >
          <animate
            attributeName="stroke-dashoffset"
            calcMode="spline"
            dur="2s"
            values="685;-685"
            keySplines="0 0 1 1"
            repeatCount="indefinite"
          />
        </path>

        {/* Plus */}
        <line x1="232" y1="75" x2="190" y2="75" stroke="#00AAB0" strokeWidth="5" />
        <line x1="212" y1="55" x2="212" y2="95" stroke="#00AAB0" strokeWidth="5" />

        {/* Minus */}
        <line x1="60" y1="75" x2="100" y2="75" stroke="#00AAB0" strokeWidth="5" />
      </svg>
    </div>
  );
}
