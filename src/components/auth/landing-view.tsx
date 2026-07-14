'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GitBranch, Sparkles, Terminal, ShieldCheck, ArrowRight, Play } from 'lucide-react';
import { useAuth } from '@/firebase';
import { initiateEmailSignIn, initiateEmailSignUp } from '@/firebase/non-blocking-login';
import { useToast } from '@/hooks/use-toast';

interface LandingViewProps {
  onEnterDemo: () => void;
}

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
      <nav className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-2">
          <GitBranch className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">Theseus</span>
        </div>
        <div className="flex gap-4">
          <Button variant="ghost" onClick={onEnterDemo}>Demo Mode</Button>
          <Button variant="outline" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Login' : 'Sign Up'}
          </Button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-4xl space-y-8 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <Sparkles className="h-3 w-3" />
            AI-Powered Pipeline Design
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            Design Data Lineage <br /> 
            <span className="text-primary">Without the Friction.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The visual workspace for Palantir Foundry engineers. Design, document, and generate PySpark code in minutes.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" className="h-12 px-8 text-md gap-2" onClick={() => setIsSignUp(true)}>
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="secondary" className="h-12 px-8 text-md gap-2" onClick={onEnterDemo}>
              <Play className="h-4 w-4 fill-current" /> Try the Demo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <Terminal className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Code Generation</CardTitle>
              <CardDescription>Instant PySpark code ready for Foundry repositories.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <Sparkles className="h-8 w-8 text-amber-500 mb-2" />
              <CardTitle>AI Spec Writer</CardTitle>
              <CardDescription>Generate functional specs from your visual designs with Genkit.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <ShieldCheck className="h-8 w-8 text-green-500 mb-2" />
              <CardTitle>Design Persistence</CardTitle>
              <CardDescription>Save versions, track changes, and share with your team securely.</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="mt-20 w-full max-w-md">
          <Card className="border-2 border-primary/20 shadow-2xl">
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
                <Button type="submit" className="w-full">
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="p-8 border-t text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Theseus. Built for high-scale data engineering.
      </footer>
    </div>
  );
}
