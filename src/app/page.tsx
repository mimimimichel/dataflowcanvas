'use client';

import React, { useState } from 'react';
import { useUser } from '@/firebase';
import MainApp from '@/components/dashboard/main-app';
import LandingView from '@/components/auth/landing-view';
import { Loader2 } from 'lucide-react';

export default function EntryPoint() {
  const { user, isUserLoading } = useUser();
  const [isDemoMode, setIsDemoMode] = useState(false);

  if (isUserLoading) {
    return (
      <div className="h-dvh w-full flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Initializing designer workspace...</p>
      </div>
    );
  }

  // If the user is logged in OR they've entered demo mode, show the main application
  if (user || isDemoMode) {
    return <MainApp />;
  }

  // Otherwise, show the landing page
  return <LandingView onEnterDemo={() => setIsDemoMode(true)} />;
}
