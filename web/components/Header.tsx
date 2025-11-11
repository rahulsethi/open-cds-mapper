export default function Header() {
  return (
    <header className="border-b bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="text-base font-semibold">OCMT</div>
        <nav className="text-sm text-gray-600">
          <a
            href="https://vercel.com/"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            Hosting plan: Vercel (UI)
          </a>
        </nav>
      </div>
    </header>
  );
}
