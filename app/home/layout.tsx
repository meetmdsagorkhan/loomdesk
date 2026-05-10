import { Inter } from 'next/font/google';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.variable} font-sans min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground`}>
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-md border-b border-white/5 bg-background/50">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="LoomDesk" className="h-8 w-auto" />
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
          <Link href="#solutions" className="hover:text-foreground transition-colors">Solutions</Link>
          <a href="https://meet.loomdesk.online" className="hover:text-foreground transition-colors">Scheduling</a>
        </div>
        <div className="flex items-center gap-4">
          <a 
            href="https://app.loomdesk.online/login" 
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Log in
          </a>
          <a 
            href="https://app.loomdesk.online/signup" 
            className="hidden md:inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-105 hover:shadow-[0_0_20px_rgba(var(--primary),0.3)]"
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-16 min-h-screen">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-background/80 py-12 px-6 md:px-12 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-4">
           <img src="/logo.png" alt="LoomDesk" className="h-6 w-auto opacity-50 grayscale" />
        </div>
        <p>© {new Date().getFullYear()} LoomDesk. All rights reserved.</p>
      </footer>
    </div>
  );
}
