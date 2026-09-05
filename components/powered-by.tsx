const STACK = [
  // Base lockup = blue/black square + "base" wordmark. Use the black lockup and
  // normalize to mono-black like the rest for a consistent row.
  { name: "Base", src: "/logos/base-lockup-black.svg", h: 19 },
  { name: "Ethereum", src: "/logos/ethereum.svg", h: 30 },
  { name: "Robinhood", src: "/logos/robinhood.svg", h: 26.4 },
  { name: "Solana", src: "/logos/solana.svg", h: 19.8 },
  { name: "Etherscan", src: "/logos/etherscan.svg", h: 24 },
  { name: "Alchemy", src: "/logos/alchemy-logo.svg", h: 22 },
  { name: "WalletConnect", src: "/logos/walletconnect.svg", h: 22 },
  { name: "Virtual Protocol", src: "/logos/virtual-protocol.svg", h: 29 }
];

// Trust strip over a fully-visible OG mega-word backdrop. The logos run in a
// continuous marquee (pauses on hover, static for reduced-motion users); the
// second copy of the stack exists purely to make the loop seamless.
export function PoweredBy() {
  return (
    <section className="page-container relative flex min-h-[380px] flex-col justify-center overflow-x-clip py-8 sm:min-h-[500px] sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden"
      >
        <span
          className="font-syne max-w-full text-[min(45vw,17rem)] font-extrabold leading-none text-transparent"
          style={{ WebkitTextStroke: "1.5px rgba(0,0,255,0.11)" }}
        >
          OG
        </span>
      </div>

      <p className="relative text-center text-[0.6rem] font-bold uppercase tracking-[0.22em] text-[#0A0B0D]/65">
        Powered by
      </p>
      <div
        className="marquee-viewport group relative mt-6 overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 10%, black 90%, transparent)"
        }}
      >
        <div className="marquee-track flex w-max items-center">
          {[...STACK, ...STACK].map(({ name, src, h }, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${name}-${i}`}
              src={src}
              alt={i < STACK.length ? name : ""}
              aria-hidden={i >= STACK.length || undefined}
              style={{ height: h }}
              className="mr-14 w-auto shrink-0 opacity-45 brightness-0 transition hover:opacity-80"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
