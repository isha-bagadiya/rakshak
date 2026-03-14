"use client";

type DashboardSignInPromptProps = {
  onSignIn: () => void;
};

export const DashboardSignInPrompt = ({ onSignIn }: DashboardSignInPromptProps) => {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-12 text-zinc-900 dark:text-zinc-100">
        <section className="w-full rounded-lg border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">Sign in to continue</h1>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            Authenticate with Privy to access your BitGo wallet dashboard.
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="rounded bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Sign in
          </button>
        </section>
      </main>
    </div>
  );
};
