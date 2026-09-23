import React from 'react';
import {
  ClerkProvider,
  SignInButton,
  UserButton,
  useAuth as useClerkAuth,
  useUser as useClerkUser,
} from '@clerk/react';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable.');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>
);

export function useAuth() {
  const auth = useClerkAuth();
  const sessionClaims = auth.sessionClaims as { metadata?: { role?: string } } | null | undefined;

  return {
    ...auth,
    role: sessionClaims?.metadata?.role === 'admin' ? 'admin' : 'customer',
    signInAs: (_role: 'admin' | 'customer') => undefined,
  };
}

export function useUser() {
  return useClerkUser();
}

export const SignedIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  return isLoaded && isSignedIn ? <>{children}</> : null;
};

export const SignedOut: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  return isLoaded && !isSignedIn ? <>{children}</> : null;
};

export { SignInButton, UserButton };