const timeline = [
  {
    step: "01",
    title: "Create wallet with BitGo security",
    desc: "Set up institutional wallet security through BitGo-backed infrastructure.",
  },
  {
    step: "02",
    title: "Assign guardians and operating roles",
    desc: "Define guardians and accountability structure for sensitive actions.",
  },
  {
    step: "03",
    title: "Run treasury transfers from dashboard",
    desc: "Execute day-to-day treasury transactions from a simple operational interface.",
  },
  {
    step: "04",
    title: "Raise recovery request on key-loss incident",
    desc: "Initiate controlled recovery when key access is lost.",
  },
  {
    step: "05",
    title: "2-of-3 guardians approve",
    desc: "Guardian threshold approval enforces governance before recovery execution.",
  },
  {
    step: "06",
    title: "Execute recovery transfer safely",
    desc: "Move funds through a policy-governed recovery transfer flow.",
  },
];

export const RecoveryTimelineSection = () => {
  return (
    <section id="recovery-timeline" className="border-t border-[rgb(122_27_122_/_0.35)] px-12 py-28 lg:px-24">
      <p className="font-mono text-xs uppercase tracking-[0.4em] text-[#9F6BB7]">Recovery Flow</p>
      <h2 className="mt-4 text-4xl font-bold tracking-tight text-[#EBDDF7] sm:text-5xl">End-to-End Recovery Timeline</h2>

      <div className="mt-12 grid grid-cols-1 gap-px border border-[rgb(122_27_122_/_0.35)] bg-[rgb(65_8_65_/_0.2)] lg:grid-cols-3">
        {timeline.map((item) => (
          <article key={item.step} className="bg-black/90 p-8 transition-colors hover:bg-[rgb(122_27_122_/_0.22)]">
            <p className="font-mono text-xs tracking-[0.18em] text-[#B57ACC]">STEP {item.step}</p>
            <h3 className="mt-4 text-2xl font-semibold text-[#EBDDF7]">{item.title}</h3>
            <p className="mt-4 text-sm leading-relaxed text-[#BDA9CC]">{item.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
