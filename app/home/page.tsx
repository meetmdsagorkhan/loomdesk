'use client';

import { motion } from 'framer-motion';
import { ArrowRight, FileText, TrendingUp, CalendarDays, Users, ShieldCheck, Clock, Medal, Check } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BentoGrid, BentoCard } from '@/components/shared/BentoGrid';

export default function MarketingPage() {
  const pricingPlans = [
    {
      name: "Starter",
      price: "0",
      description: "Perfect for small teams getting started with support operations.",
      features: [
        "Up to 3 team members",
        "Basic scheduling",
        "Standard reporting",
        "Community support",
        "Public booking pages"
      ],
      cta: "Start for free",
      highlight: false
    },
    {
      name: "Professional",
      price: "19",
      description: "Advanced tools for growing teams that need precision and scale.",
      features: [
        "Unlimited members",
        "Advanced QA scoring",
        "Shift & Leave management",
        "Priority support",
        "Google Calendar sync",
        "Custom subdomains"
      ],
      cta: "Get Started",
      highlight: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "Maximum security and control for large-scale operations.",
      features: [
        "Everything in Professional",
        "SSO & SAML integration",
        "Full audit logs",
        "24/7 Dedicated support",
        "Custom API access",
        "SLA guarantees"
      ],
      cta: "Contact Sales",
      highlight: false
    }
  ];

  return (
    <div className="flex flex-col items-center overflow-hidden">
      
      {/* 1. HERO SECTION */}
      <section className="relative w-full max-w-7xl px-6 pt-20 pb-32 text-center">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-w-4xl mx-auto"
        >
          <Badge variant="outline" className="mb-6 border-primary/30 bg-primary/10 text-primary px-4 py-1.5 backdrop-blur-md">
            The Future of Support Operations ✨
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 font-heading">
            Manage your team with <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-purple-500">
              effortless precision.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            LoomDesk brings intelligent scheduling, QA scoring, and seamless leave management into one ultra-premium workspace.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://app.loomdesk.online/signup">
              <Button size="lg" className="rounded-full h-14 px-8 text-base bg-primary hover:bg-primary/90 hover:scale-105 transition-all shadow-[0_0_40px_rgba(var(--primary),0.4)]">
                Start for free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <a href="https://meet.loomdesk.online">
              <Button variant="outline" size="lg" className="rounded-full h-14 px-8 text-base hover:bg-white/5 border-white/10 backdrop-blur-md">
                View Scheduling
              </Button>
            </a>
          </div>
        </motion.div>

        {/* 2. "LIVE" APP PREVIEW (REAL UI COMPONENTS) */}
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-20 mx-auto max-w-6xl z-20 perspective-[2000px]"
        >
          <div 
            className="rounded-xl overflow-hidden border border-white/10 bg-background/50 backdrop-blur-2xl shadow-2xl shadow-primary/20 transform-gpu rotate-x-[5deg] hover:rotate-x-0 transition-transform duration-700"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Fake Browser Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <div className="mx-auto bg-black/40 text-muted-foreground text-xs px-4 py-1 rounded-full flex items-center gap-2 border border-white/5">
                🔒 app.loomdesk.online
              </div>
            </div>

            {/* Simulated Dashboard UI using actual components */}
            <div className="p-6 md:p-10 bg-gradient-to-br from-background via-background to-primary/5 text-left pointer-events-none">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <Badge className="mb-2 bg-primary/20 text-primary border-none">Admin Dashboard</Badge>
                  <h2 className="text-2xl font-bold font-heading">Welcome back, Sarah</h2>
                  <p className="text-muted-foreground text-sm">Here's what's happening with your team today.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <StatCard title="Reports" value={142} icon={<FileText size={18} />} color="primary" change={12} />
                <StatCard title="Avg Score" value={94.5} icon={<TrendingUp size={18} />} color="warning" change={3} />
                <StatCard title="Pending Leaves" value={4} icon={<CalendarDays size={18} />} color="accent" change={0} />
                <StatCard title="Active Team" value={28} icon={<Users size={18} />} color="success" change={5} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold">Team Leaderboard</h3>
                    <Badge variant="secondary"><Medal className="w-3 h-3 mr-1 text-amber-500"/> Top Performers</Badge>
                  </div>
                  <div className="space-y-4">
                    {[
                      { name: 'Alex Johnson', score: 98, reports: 45 },
                      { name: 'Maria Garcia', score: 95, reports: 38 },
                      { name: 'James Smith', score: 92, reports: 41 }
                    ].map((user, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">{user.name[0]}</div>
                          <span className="text-sm font-medium">{user.name}</span>
                        </div>
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">{user.score}%</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 flex flex-col">
                  <h3 className="font-semibold text-muted-foreground uppercase tracking-widest text-xs mb-4">System Status</h3>
                  <div className="flex items-center gap-3 bg-black/20 p-3 rounded-lg border border-white/5 mb-3">
                    <ShieldCheck className="text-success" />
                    <div>
                      <p className="text-sm font-medium">API Services</p>
                      <p className="text-xs text-success">Operational</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-black/20 p-3 rounded-lg border border-white/5">
                    <Clock className="text-primary" />
                    <div>
                      <p className="text-sm font-medium">Next Sync</p>
                      <p className="text-xs text-muted-foreground">In 14 mins</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 3. FEATURES SECTION */}
      <section id="features" className="w-full max-w-7xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4">Everything you need.</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Built from the ground up for modern support operations teams.</p>
        </div>

        <BentoGrid className="max-w-5xl mx-auto">
          <BentoCard colSpan={2} className="relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <h3 className="text-2xl font-bold mb-2 relative z-10">Intelligent Scheduling</h3>
            <p className="text-muted-foreground mb-6 relative z-10">Automatically manage shifts, time-offs, and calendar syncs with Google Calendar.</p>
            <div className="mt-4 bg-background/50 rounded-lg p-4 border border-white/10 relative z-10 transform group-hover:-translate-y-2 transition-transform duration-500">
               <div className="flex justify-between items-center mb-2">
                 <div className="w-1/2 h-2 bg-primary/20 rounded" />
                 <div className="w-1/4 h-2 bg-success/20 rounded" />
               </div>
               <div className="w-full h-8 bg-white/5 rounded mt-4 flex items-center px-3 gap-2">
                 <CalendarDays className="w-4 h-4 text-primary" />
                 <span className="text-xs text-muted-foreground">meet.loomdesk.online</span>
               </div>
            </div>
          </BentoCard>

          <BentoCard className="relative overflow-hidden group">
            <h3 className="text-xl font-bold mb-2">QA Scoring</h3>
            <p className="text-muted-foreground text-sm mb-4">Track performance with precision.</p>
            <div className="w-full aspect-square rounded-full border-4 border-white/5 flex items-center justify-center relative mt-8 group-hover:scale-110 transition-transform duration-500">
               <svg viewBox="0 0 100 100" className="w-full h-full absolute -rotate-90">
                 <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-white/5" />
                 <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray="251" strokeDashoffset="25" className="text-warning transition-all duration-1000 ease-out" />
               </svg>
               <span className="text-2xl font-bold text-warning">90%</span>
            </div>
          </BentoCard>

          <BentoCard className="relative overflow-hidden group">
             <h3 className="text-xl font-bold mb-2">Subdomain Routing</h3>
             <p className="text-muted-foreground text-sm mb-4">Dedicated workspaces.</p>
             <div className="space-y-2 mt-auto pt-4">
               <div className="p-2 bg-white/5 rounded text-xs font-mono border border-white/5 group-hover:border-primary/50 transition-colors">admin.loomdesk.online</div>
               <div className="p-2 bg-white/5 rounded text-xs font-mono border border-white/5 group-hover:border-accent/50 transition-colors">dashboard.loomdesk...</div>
             </div>
          </BentoCard>
        </BentoGrid>
      </section>

      {/* 4. PRICING SECTION */}
      <section id="pricing" className="w-full max-w-7xl px-6 py-24 bg-white/[0.02]">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Pricing</Badge>
          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4">Simple, transparent pricing.</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Choose the plan that fits your team's needs.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative flex flex-col p-8 rounded-3xl border ${plan.highlight ? 'border-primary bg-primary/5 shadow-[0_0_40px_rgba(var(--primary),0.1)]' : 'border-white/10 bg-white/5'} backdrop-blur-sm`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full uppercase tracking-widest">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">${plan.price}</span>
                {plan.price !== "Custom" && <span className="text-muted-foreground">/mo per seat</span>}
              </div>
              <p className="text-sm text-muted-foreground mb-8">{plan.description}</p>
              
              <div className="space-y-4 mb-10 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 text-sm">
                    <div className="mt-1 w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-primary" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <a href="https://app.loomdesk.online/signup" className="w-full">
                <Button variant={plan.highlight ? 'default' : 'outline'} className="w-full rounded-full h-12">
                  {plan.cta}
                </Button>
              </a>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 5. FINAL CTA SECTION */}
      <section className="w-full max-w-5xl px-6 py-24">
        <div className="rounded-3xl p-12 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-white/10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 to-transparent pointer-events-none" />
          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-6 relative z-10">Ready to transform your <br className="hidden md:block" /> support operations?</h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto relative z-10">Join teams who are already scaling their operations with LoomDesk's intelligent platform.</p>
          <a href="https://app.loomdesk.online/signup" className="relative z-10">
            <Button size="lg" className="rounded-full h-14 px-10 text-lg shadow-[0_0_30px_rgba(var(--primary),0.3)] hover:scale-105 transition-transform">Get Started Now</Button>
          </a>
        </div>
      </section>

    </div>
  );
}
