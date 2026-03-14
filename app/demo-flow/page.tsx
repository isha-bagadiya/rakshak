import Link from "next/link";

const steps = [
  {
    title: "1. Setup Guardians + Wallet",
    path: "/",
    description: "Complete guardian setup and create/select your hot wallet.",
  },
  {
    title: "2. Normal Transfer Demo",
    path: "/transfer",
    description: "Send a small transaction using user signer + BitGo co-sign.",
  },
  {
    title: "3. Lost Key Incident + Request",
    path: "/recover-address",
    description: "Submit a recovery request with reason and wallet ID.",
  },
  {
    title: "4. Guardian Approvals",
    path: "/guardian/requests",
    description: "Each guardian reviews and approves/rejects the challenge.",
  },
  {
    title: "5. Recovery Transfer Execute",
    path: "/recovery-execute",
    description: "Execute payout via approved recovery request (backup key + BitGo).",
  },
  {
    title: "6. Audit Proof",
    path: "/audit",
    description: "Show complete timeline and tx references for judges.",
  },
];

export default function DemoFlowPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-12 text-[#EBDDF7] sm:px-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <div className="pointer-events-none absolute -top-28 left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-[rgb(122_27_122_/_0.25)] blur-3xl" />

      <section className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-[rgb(122_27_122_/_0.35)] pb-6">
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.35em] text-[#BDA9CC]">SmartVault Runbook</p>
            <h1 className="text-4xl font-semibold tracking-tight text-[#F3E9FA] md:text-5xl">Hackathon Demo Flow</h1>
            <p className="mt-4 max-w-2xl text-sm text-[#C6B2D6] md:text-base">
              Execute these routes in order to show standard transactions, compromised-key recovery, guardian consensus,
              and audit trail proof.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center border border-[rgb(122_27_122_/_0.6)] bg-[rgb(65_8_65_/_0.4)] px-5 font-mono text-xs uppercase tracking-[0.2em] text-[#EBDDF7] transition-colors hover:border-[rgb(122_27_122)] hover:bg-[rgb(122_27_122_/_0.3)]"
          >
            Open Dashboard
          </Link>
        </div>

        <ul className="grid gap-4 md:grid-cols-2">
          {steps.map((step) => (
            <li
              key={step.path}
              className="group relative overflow-hidden border border-[rgb(122_27_122_/_0.35)] bg-[linear-gradient(160deg,rgba(65,8,65,0.45),rgba(10,10,10,0.92))] p-5 transition-colors hover:border-[rgb(122_27_122_/_0.75)]"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[rgb(214,188,229)]/80 to-transparent opacity-60" />
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#BDA9CC]">Demo Step</p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-[#F3E9FA]">{step.title}</h2>
              <p className="mt-3 text-sm text-[#C6B2D6]">{step.description}</p>
              <Link
                href={step.path}
                className="mt-4 inline-flex items-center font-mono text-xs uppercase tracking-[0.2em] text-[#D6BCE5] transition-colors group-hover:text-white"
              >
                Open Route {step.path}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
