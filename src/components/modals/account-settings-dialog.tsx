'use client';

import React, { useState } from 'react';
import { signOut, deleteUser, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, getAuth } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { User as UserIcon, Mail, LogOut, Trash2, Loader2, CheckCircle, XCircle, KeyRound } from 'lucide-react';

interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User | null;
  onSignOut: () => void;
}

export default function AccountSettingsDialog({ open, onOpenChange, currentUser, onSignOut }: AccountSettingsDialogProps) {
  const [email, setEmail] = useState(currentUser?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (open) {
      setEmail(currentUser?.email || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setLoading(false);
      setSuccess('');
      setError('');
    }
  }, [open, currentUser]);

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut(getAuth());
      onSignOut();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!email || !currentUser) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Re-authenticate required for sensitive operations
      if (currentPassword && currentUser.email) {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
      }
      
      await updateEmail(currentUser, email);
      setSuccess('Email updated successfully!');
      setCurrentPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update email');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword !== confirmNewPassword || !currentUser) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Re-authenticate required
      if (currentPassword && currentUser.email) {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
      }
      
      await updatePassword(currentUser, newPassword);
      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) {
      setError('No user found');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Re-authenticate required for delete
      if (currentPassword && currentUser.email) {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
      }
      
      await deleteUser(currentUser);
      onSignOut();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  const isAnonymous = currentUser?.isAnonymous;

  if (!currentUser) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <UserIcon className="h-5 w-5 text-primary" />
            Account Settings
          </DialogTitle>
          <DialogDescription>
            Manage your account preferences and security
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="danger">Danger</TabsTrigger>
          </TabsList>

          {/* INFO TAB */}
          <TabsContent value="info" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">User ID</Label>
                <div className="text-xs font-mono bg-muted p-2 rounded break-all">
                  {currentUser.uid}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Account Type</Label>
                <div className="text-sm">
                  {isAnonymous ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-medium">
                      👤 Anonymous (Demo)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium">
                      ✉️ Email Account
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-display" className="text-sm font-medium">Email</Label>
                <div className="text-sm text-muted-foreground" id="email-display">
                  {currentUser.email || 'No email set'}
                </div>
              </div>

              {currentUser.emailVerified !== undefined && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email Verified</Label>
                  <div className="text-sm">
                    {currentUser.emailVerified ? (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5" /> Not verified
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* SECURITY TAB */}
          <TabsContent value="security" className="space-y-6 mt-6">
            {isAnonymous ? (
              <div className="space-y-4 text-center py-8">
                <KeyRound className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  Upgrade from anonymous to email account for full access
                </p>
                <p className="text-xs text-muted-foreground">
                  Anonymous accounts have limited storage and features.
                  Create an email account to save your pipelines permanently.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Update Email</Label>
                    <div className="space-y-2">
                      <Label htmlFor="new-email">New Email</Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="new@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cur-pass-email">Current Password</Label>
                      <Input
                        id="cur-pass-email"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                      />
                    </div>
                    <Button onClick={handleUpdateEmail} disabled={loading} className="w-full">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Update Email
                    </Button>
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <Label className="text-base font-semibold">Change Password</Label>
                    <div className="space-y-2">
                      <Label htmlFor="cur-pass">Current Password</Label>
                      <Input
                        id="cur-pass"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-pass">New Password</Label>
                      <Input
                        id="new-pass"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-pass">Confirm Password</Label>
                      <Input
                        id="confirm-pass"
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Confirm new password"
                      />
                    </div>
                    <Button onClick={handleUpdatePassword} disabled={loading} className="w-full">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Change Password
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* DANGER TAB */}
          <TabsContent value="danger" className="space-y-6 mt-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-destructive">
                  <LogOut className="h-5 w-5" />
                  <div>
                    <h4 className="font-semibold">Sign Out</h4>
                    <p className="text-sm text-muted-foreground">
                      You'll be returned to the landing page
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleSignOut} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Sign Out
                </Button>
              </div>

              <div className="border-t pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                    <Trash2 className="h-5 w-5" />
                    <div>
                      <h4 className="font-semibold">Delete Account</h4>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all data. This cannot be undone.
                      </p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete My Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account 
                          and remove all your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {success && (
          <div className="mt-4 p-3 rounded-md bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {success}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-md bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 text-sm flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <DialogFooter className="pt-4 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
