const STACK = [
  { name: "Base", src: "/logos/base-square-black.svg", h: 26 },
  { name: "Ethereum", src: "/logos/ethereum.svg", h: 30 },
  { name: "Robinhood", src: "/logos/robinhood.svg", h: 26 },
  { name: "Virtual IO", src: "/logos/virtual-io.svg", h: 24 },
  { name: "Alchemy", src: "/logos/alchemy-logo.svg", h: 22 }
];

// Trust strip: the stack we're built on. Logos ship in mixed colors (white,
// dark, full-color PNG), so we normalize them all to mono-black via filter for
// a consistent look on the white page background.
export function PoweredBy() {
  return (
    <section className="page-container py-8 sm:py-10">
      <p className="text-center text-[0.6rem] font-bold uppercase tracking-[0.22em] text-[#0A0B0D]/35">
        Powered by
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-9 gap-y-6 sm:gap-x-14">
        {STACK.map(({ name, src, h }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={name}
            src={src}
            alt={name}
            style={{ height: h }}
            className="w-auto opacity-45 brightness-0 transition hover:opacity-80"
          />
        ))}
      </div>
    </section>
  );
}
