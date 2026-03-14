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
    <main className="mx-auto max-w-4xl px-4 py-10 text-zinc-900 dark:text-zinc-100">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Hackathon Demo Flow</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          Dashboard
        </Link>
      </div>

      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Run these routes in sequence during your demo to show normal operations, key-loss recovery,
        and auditability.
      </p>

      <ul className="space-y-3">
        {steps.map((step) => (
          <li key={step.path} className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="font-medium">{step.title}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{step.description}</p>
            <Link href={step.path} className="mt-2 inline-block text-sm text-blue-600 hover:underline">
              Open {step.path}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
