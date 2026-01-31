import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Lyra Airtable Clone</h1>
        <p className="text-sm text-neutral-600">
          Primary routes for the MVP structure.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <Link className="underline" href="/login">
          /login
        </Link>
        <Link className="underline" href="/bases">
          /bases
        </Link>
        <Link className="underline" href="/bases/demo-base/tables">
          /bases/[baseId]/tables
        </Link>
      </section>
    </main>
  );
}
