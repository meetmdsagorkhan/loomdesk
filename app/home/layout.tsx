import Link from 'next/link';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative">
      {/* Navigation */}
      <nav className="glass-nav fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="LoomDesk" className="h-8 w-auto" />
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground font-sans">
          <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
          <Link href="#solutions" className="hover:text-foreground transition-colors">Solutions</Link>
          <a href="https://meet.loomdesk.online" className="hover:text-foreground transition-colors">Scheduling</a>
        </div>
        <div className="flex items-center gap-4">
          <a 
            href="https://app.loomdesk.online/login" 
            className="text-sm font-medium text-foreground hover:text-primary transition-colors font-sans"
          >
            Log in
          </a>
          <a 
            href="https://app.loomdesk.online/signup" 
            className="btn-primary inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-medium transition-all font-sans"
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="glass-panel py-12 px-6 md:px-12 text-center text-sm text-muted-foreground mt-20">
        <div className="flex items-center justify-center gap-2 mb-4">
           <img src="/logo.png" alt="LoomDesk" className="h-6 w-auto opacity-50 grayscale" />
        </div>
        <p className="font-sans">© {new Date().getFullYear()} LoomDesk. All rights reserved.</p>
      </footer>
    </div>
  );
}
