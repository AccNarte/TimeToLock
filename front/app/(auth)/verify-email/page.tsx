"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Clock, CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authService } from '@/lib/api/services/auth.service';

type VerificationState = 'loading' | 'success' | 'error' | 'no-token';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<VerificationState>('loading');
  const [message, setMessage] = useState<string>('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setState('no-token');
      return;
    }

    const verifyEmail = async () => {
      try {
        const result = await authService.verifyEmail(token);
        if (result.success) {
          setState('success');
          setMessage(result.message);
        } else {
          setState('error');
          setMessage(result.message);
        }
      } catch (err: any) {
        setState('error');
        setMessage(err.response?.data?.message || 'Erreur lors de la verification');
      }
    };

    verifyEmail();
  }, [token]);

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-cyan-neon/20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-neon animate-spin" />
              </div>
            </div>
            <h2 className="text-heading-3 text-white text-center mb-2">
              Verification en cours...
            </h2>
            <p className="text-text-secondary text-center">
              Veuillez patienter pendant que nous verifions votre email.
            </p>
          </>
        );

      case 'success':
        return (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </div>
            <h2 className="text-heading-3 text-white text-center mb-2">
              Email verifie !
            </h2>
            <p className="text-text-secondary text-center mb-6">
              {message || 'Votre adresse email a ete verifiee avec succes.'}
            </p>
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full glass-button h-11 text-base font-semibold"
            >
              Aller au tableau de bord
            </Button>
          </>
        );

      case 'error':
        return (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-error" />
              </div>
            </div>
            <h2 className="text-heading-3 text-white text-center mb-2">
              Echec de la verification
            </h2>
            <p className="text-text-secondary text-center mb-6">
              {message || 'Le lien de verification est invalide ou a expire.'}
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => router.push('/login')}
                className="w-full glass-button h-11 text-base font-semibold"
              >
                Se connecter
              </Button>
              <p className="text-text-muted text-center text-sm">
                Connectez-vous pour renvoyer un email de verification.
              </p>
            </div>
          </>
        );

      case 'no-token':
        return (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center">
                <Mail className="w-8 h-8 text-warning" />
              </div>
            </div>
            <h2 className="text-heading-3 text-white text-center mb-2">
              Token manquant
            </h2>
            <p className="text-text-secondary text-center mb-6">
              Aucun token de verification n'a ete fourni. Veuillez utiliser le lien envoye par email.
            </p>
            <Button
              onClick={() => router.push('/login')}
              className="w-full glass-button h-11 text-base font-semibold"
            >
              Retour a la connexion
            </Button>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="relative">
            <Lock className="w-10 h-10 text-cyan-neon" />
            <Clock className="w-6 h-6 text-cyan-neon absolute -bottom-1 -right-1" />
          </div>
          <h1 className="text-heading-2 text-white font-bold">TimeLock</h1>
        </div>

        {/* Verification Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-heading-3 text-center text-white">
              Verification Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <Loader2 className="w-8 h-8 text-cyan-neon animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
