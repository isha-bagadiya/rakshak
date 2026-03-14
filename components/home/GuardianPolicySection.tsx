const policies = [
  "Wallet setup with BitGo security",
  "Policy-aware transfer workflow",
  "Guardian approval orchestration",
  "Recovery actions in one workflow",
  "Operational controls for institutions",
];

export const GuardianPolicySection = () => {
  return (
    <section id="guardian-policy" className="border-t border-[rgb(122_27_122_/_0.35)] px-12 py-28 lg:px-24">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-[#9F6BB7]">Architecture</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-[#EBDDF7] sm:text-5xl">An orchestration layer between institutions and BitGo</h2>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[#BDA9CC] sm:text-base">
            BitGo already provides enterprise wallet infrastructure. Our product turns that technical stack into an
            operational product for teams: wallet setup, policy-aware transfers, guardian approvals, and recovery
            actions in one workflow.
          </p>
        </div>

        <div className="border border-[rgb(122_27_122_/_0.45)] bg-[rgb(65_8_65_/_0.28)] p-6 backdrop-blur-xl sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#B57ACC]">Orchestration Layer</p>
          <ul className="mt-5 space-y-3">
            {policies.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-[#E2D1EE]">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[#B57ACC]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
