import { Mail } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="absolute top-0 right-0 left-0 z-10 flex h-16 items-center justify-between px-6 md:px-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="bg-foreground flex h-9 w-9 items-center justify-center rounded-lg">
            <Mail className="text-background h-4 w-4" />
          </div>
          <span className="text-lg font-medium tracking-tight">Chronicle</span>
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Background Pattern - Chronicle Style */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(0,0,0,0))]" />
      </div>
    </div>
  );
}
