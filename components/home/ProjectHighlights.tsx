const highlights = [
  {
    title: "BitGo Without SDK Complexity",
    desc: "Teams get a usable treasury interface while BitGo handles wallet-grade security under the hood.",
  },
  {
    title: "Transfer Operations for PMs",
    desc: "Dedicated transfer page to create and sign transactions through a policy-aware workflow.",
  },
  {
    title: "Lost-Key Recovery Workflow",
    desc: "If user key access is lost, guardians approve recovery and funds can be moved safely using backup flow.",
  },
  {
    title: "Institution-Ready Controls",
    desc: "Built for DAO, NGO, and startup treasury operations that need accountability and operational continuity.",
  },
];

export const ProjectHighlights = () => {
  return (
    <section id="project-highlights" className="border-t border-[rgb(122_27_122_/_0.35)] px-12 py-28 lg:px-24">
      <div className="mb-14 flex items-end justify-between gap-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-[#9F6BB7]">Project Scope</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-[#EBDDF7] sm:text-5xl">What Rakshak Delivers</h2>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-[#BDA9CC] sm:text-base">
          BitGo provides enterprise wallet infrastructure. Rakshak brings the operational layer teams can actually run.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-px border border-[rgb(122_27_122_/_0.35)] bg-[rgb(65_8_65_/_0.2)] md:grid-cols-2">
        {highlights.map((item) => (
          <article key={item.title} className="bg-black/90 p-8 transition-colors hover:bg-[rgb(122_27_122_/_0.22)] sm:p-10">
            <h3 className="text-xl font-semibold text-[#EBDDF7]">{item.title}</h3>
            <p className="mt-4 text-sm leading-relaxed text-[#BDA9CC] sm:text-base">{item.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
