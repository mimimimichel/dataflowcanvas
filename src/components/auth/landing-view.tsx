'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GitBranch, Sparkles, Terminal, ShieldCheck, ArrowRight, Play, FileText, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/firebase';
import { initiateEmailSignIn, initiateEmailSignUp } from '@/firebase/non-blocking-login';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/shared/theme-toggle';

interface LandingViewProps {
  onEnterDemo: () => void;
}

const FEATURES = [
  {
    icon: Terminal,
    title: 'Visual Pipeline Designer',
    description: 'Drag-and-drop canvas for sources, transformations and destinations — instant PySpark code ready for Foundry repositories.',
  },
  {
    icon: FileText,
    title: 'Data Product Documentation',
    description: 'Identity card, decision log, runbook and version history — living documentation that lives next to the pipeline it describes.',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance Audit',
    description: 'A live governance score on the canvas, always visible — not a report you generate once and forget.',
  },
  {
    icon: Sparkles,
    title: 'AI Spec Writer',
    description: 'Generate functional specs, dbt projects and Mission Spec workbooks straight from your visual design.',
  },
];

const AT_A_GLANCE = [
  { value: '25+', label: 'Node types', caption: 'sources, transforms, destinations' },
  { value: '3', label: 'Export formats', caption: 'PySpark · dbt · Mission Spec .xlsx' },
  { value: 'Live', label: 'Compliance score', caption: 'scored on the canvas as you design' },
  { value: 'Zero', label: 'Install required', caption: 'runs entirely in your browser' },
];

export default function LandingView({ onEnterDemo }: LandingViewProps) {
  const auth = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (isSignUp) {
      initiateEmailSignUp(auth, email, password);
      toast({ title: "Account created", description: "Welcome to Theseus!" });
    } else {
      initiateEmailSignIn(auth, email, password);
      toast({ title: "Welcome back", description: "Signing you in..." });
    }
  };

  return (
    <div className="min-h-dvh w-full flex flex-col bg-background">
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <GitBranch className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-extrabold tracking-tight">Theseus</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle className="h-9 w-9" />
          <Button variant="ghost" onClick={onEnterDemo}>Demo Mode</Button>
          <Button variant="outline" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Login' : 'Sign Up'}
          </Button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center px-6 py-16 sm:py-20 text-center">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-[0.2em]">
            <span className="text-base leading-none">✦</span> AI-Powered Pipeline Design
          </div>
          <h1 className="text-4xl sm:text-6xl leading-[1.05] tracking-tight">
            <span className="font-medium text-foreground/90">Design Data Lineage</span>
            <br />
            <span className="font-extrabold text-primary">Without the Friction.</span>
          </h1>

          <div className="flex items-center justify-center gap-3 pt-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="h-px w-24 bg-primary/40" />
            <span className="h-2 w-2 rounded-full bg-primary" />
          </div>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            The visual workspace for Palantir Foundry engineers. Design, document, and generate PySpark code in minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button size="lg" className="h-11 px-7 gap-2" onClick={() => setIsSignUp(true)}>
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-11 px-7 gap-2" onClick={onEnterDemo}>
              <Play className="h-3.5 w-3.5 fill-current" /> Try the Demo
            </Button>
          </div>
        </div>

        {/* Product identity card — mirrors a structured fact-sheet layout */}
        <div className="mt-16 w-full max-w-2xl rounded-2xl border border-border overflow-hidden text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {[
              { label: 'Platform', value: 'Palantir Foundry' },
              { label: 'Output', value: 'PySpark · dbt · YAML' },
              { label: 'Audience', value: 'Data platform teams' },
              { label: 'Deployment', value: 'Runs in your browser' },
            ].map((item, i) => (
              <div
                key={item.label}
                className={
                  'p-5 sm:p-6 ' +
                  (i % 2 === 0 ? 'sm:border-r border-border' : '') +
                  (i < 2 ? ' border-b border-border' : '')
                }
              >
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{item.label}</p>
                <p className="text-base font-bold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Callout — inverted contrast block, consistent in both themes */}
        <div className="mt-6 w-full max-w-2xl rounded-2xl bg-foreground text-background px-6 py-5 text-sm text-left leading-relaxed">
          Your designs stay in your browser by default: nothing is sent to a server until you choose to export a
          spec, generate code, or share a link with your team.
        </div>

        {/* At a glance stats — echoes the "chiffres clés" pattern */}
        <div className="mt-20 w-full max-w-5xl text-left">
          <div className="border-t border-foreground/80 pt-4 mb-8">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Product at a glance</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {AT_A_GLANCE.map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">{stat.label}</p>
                <p className="text-xs text-muted-foreground/80 mt-0.5">{stat.caption}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feature grid */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-5xl text-left">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="border-border shadow-none">
              <CardHeader className="space-y-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <feature.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <CardTitle className="text-base">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-20 w-full max-w-md">
          <Card className="border-border shadow-none text-left">
            <CardHeader>
              <CardTitle>{isSignUp ? 'Create an account' : 'Sign in to your design'}</CardTitle>
              <CardDescription>Manage your pipeline lineages in one place.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuth} className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full gap-2">
                  {isSignUp ? 'Create Account' : 'Sign In'} <ArrowUpRight className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border px-6 sm:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <span>Theseus · Visual Pipeline Designer</span>
        <span>&copy; {new Date().getFullYear()} — Built for data teams</span>
      </footer>
    </div>
  );
}
