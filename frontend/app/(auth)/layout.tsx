import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid-bg flex flex-col relative overflow-hidden">

      <header className="relative z-10 p-6">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center shadow-glow-sm">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="text-xl font-bold grad-purple-cyan">Pédja</span>
        </Link>
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      {/* Bottom grid accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/25 to-transparent" />
    </div>
  );
}
