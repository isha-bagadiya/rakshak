const stack = [
  "Programmable wallet actions",
  "Approval-driven workflows",
  "Guardian-based recovery",
  "Policy-aware transfers",
  "Operational dashboard for teams",
  "Institutional control model",
];

export const TechStackSection = () => {
  return (
    <section id="tech-stack" className="border-t border-[rgb(122_27_122_/_0.35)] px-12 py-28 lg:px-24">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-[#9F6BB7]">Track Alignment</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-[#EBDDF7] sm:text-5xl">Built for the ETHMumbai BitGo DeFi Security Track</h2>
          <p className="mt-6 text-sm leading-relaxed text-[#BDA9CC] sm:text-base">
            This project uses BitGo wallet infrastructure to deliver institutional-grade controls for on-chain treasury
            operations. We combine programmable wallet actions, approval-driven workflows, and recovery procedures into
            a practical product for non-technical institutional teams.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-px border border-[rgb(122_27_122_/_0.35)] bg-[rgb(65_8_65_/_0.2)]">
          {stack.map((item) => (
            <div key={item} className="bg-black/90 px-5 py-6 text-sm text-[#E2D1EE] transition-colors hover:bg-[rgb(122_27_122_/_0.2)] sm:text-base">
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
