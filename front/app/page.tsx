'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import {
  FileText,
  Bitcoin,
  ArrowRight,
  CheckCircle2,
  Zap,
  Globe,
  Key,
  Shield,
  Coins,
  BadgeDollarSign,
  Infinity,
  Lock,
  Trash2,
  Wallet,
  ShieldCheck
} from 'lucide-react';
import { useEffect, useState } from 'react';

// Animated background particles - positions are fixed to avoid hydration mismatch
const particlePositions = [
  { left: 10, top: 15, delay: 0, duration: 8 },
  { left: 25, top: 80, delay: 1, duration: 10 },
  { left: 40, top: 30, delay: 2, duration: 9 },
  { left: 55, top: 70, delay: 0.5, duration: 11 },
  { left: 70, top: 20, delay: 3, duration: 8.5 },
  { left: 85, top: 60, delay: 1.5, duration: 10.5 },
  { left: 15, top: 45, delay: 4, duration: 9.5 },
  { left: 30, top: 90, delay: 2.5, duration: 8 },
  { left: 50, top: 10, delay: 0, duration: 12 },
  { left: 65, top: 50, delay: 3.5, duration: 9 },
  { left: 80, top: 85, delay: 1, duration: 10 },
  { left: 95, top: 35, delay: 4.5, duration: 11 },
  { left: 5, top: 65, delay: 2, duration: 8.5 },
  { left: 20, top: 25, delay: 3, duration: 9 },
  { left: 35, top: 55, delay: 0.5, duration: 10.5 },
  { left: 45, top: 95, delay: 1.5, duration: 8 },
  { left: 60, top: 40, delay: 4, duration: 11.5 },
  { left: 75, top: 75, delay: 2.5, duration: 9 },
  { left: 90, top: 5, delay: 0, duration: 10 },
  { left: 12, top: 88, delay: 3.5, duration: 8.5 },
];

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particlePositions.map((pos, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-cyan-neon/30 rounded-full animate-float"
          style={{
            left: `${pos.left}%`,
            top: `${pos.top}%`,
            animationDelay: `${pos.delay}s`,
            animationDuration: `${pos.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

// Hero visual - simple crypto & file lock illustration
function HeroVisual() {
  return (
    <div className="relative flex items-center justify-center gap-8 md:gap-12">
      {/* File Lock Card */}
      <div className="relative group">
        <div className="absolute -inset-4 bg-cyan-neon/10 rounded-3xl blur-2xl group-hover:bg-cyan-neon/20 transition-colors duration-500" />
        <div className="relative p-6 md:p-8 rounded-2xl bg-glass-surface/60 border border-cyan-neon/30 backdrop-blur-xl">
          <FileText className="w-12 h-12 md:w-16 md:h-16 text-cyan-neon mb-3" strokeWidth={1.5} />
          <div className="text-xs md:text-sm text-text-muted text-center">Files</div>
        </div>
      </div>

      {/* Center Logo */}
      <div className="relative">
        <div className="absolute -inset-8 bg-cyan-neon/20 rounded-full blur-3xl animate-pulse" />
        <Image
          src="/logo.svg"
          alt="TimeLock"
          width={120}
          height={120}
          className="relative w-24 h-24 md:w-32 md:h-32 drop-shadow-[0_0_40px_rgba(0,238,255,0.5)]"
        />
      </div>

      {/* Crypto Lock Card */}
      <div className="relative group">
        <div className="absolute -inset-4 bg-warning/10 rounded-3xl blur-2xl group-hover:bg-warning/20 transition-colors duration-500" />
        <div className="relative p-6 md:p-8 rounded-2xl bg-glass-surface/60 border border-warning/30 backdrop-blur-xl">
          <Bitcoin className="w-12 h-12 md:w-16 md:h-16 text-warning mb-3" strokeWidth={1.5} />
          <div className="text-xs md:text-sm text-text-muted text-center">Crypto</div>
        </div>
      </div>

      {/* Connecting lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
        <defs>
          <linearGradient id="lineGradientLeft" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00EEFF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#00EEFF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGradientRight" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Feature card component
function FeatureCard({
  icon: Icon,
  title,
  description,
  delay = 0
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`group relative p-6 rounded-2xl bg-gradient-to-br from-glass-surface/60 to-glass-surface/30 border border-glass-border/50 backdrop-blur-xl transition-all duration-700 hover:border-cyan-neon/50 hover:shadow-[0_0_40px_rgba(0,238,255,0.15)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-neon/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />

      <div className="relative">
        <div className="w-14 h-14 rounded-xl bg-cyan-neon/10 border border-cyan-neon/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-7 h-7 text-cyan-neon" strokeWidth={1.5} />
        </div>

        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-text-secondary text-body-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// Stats counter animation
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{count}{suffix}</span>;
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-dark-blue relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-neon/5 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-dark/10 via-transparent to-transparent" />
      <FloatingParticles />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,238,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,238,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Navigation */}
      <nav className={`relative z-50 flex items-center justify-between px-6 md:px-12 py-6 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="TimeLock"
            width={40}
            height={40}
            className="w-10 h-10"
          />
          <span className="text-2xl font-bold bg-gradient-to-r from-white to-cyan-light bg-clip-text text-transparent">
            TimeLock
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-white hover:text-cyan-neon">
              Connexion
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-cyan-neon text-dark-blue hover:bg-cyan-light font-semibold px-6">
              Commencer
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 md:px-12 pt-12 md:pt-20 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className={`transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-cyan-neon/10 border border-cyan-neon/20 mb-6">
                <Image
                  src="/polygon-matic-logo.png"
                  alt="Polygon"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <span className="text-cyan-neon text-sm font-medium">Sécurisé par Polygon Blockchain</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Verrouillez vos
                <span className="block bg-gradient-to-r from-cyan-neon via-cyan-light to-cyan-neon bg-clip-text text-transparent animate-gradient">
                  actifs numériques
                </span>
                dans le temps
              </h1>

              <p className="text-lg text-text-secondary mb-8 max-w-xl text-body leading-relaxed">
                TimeLock vous permet de sécuriser vos fichiers et cryptomonnaies avec un verrouillage temporel immuable.
                Chiffrement AES-256, stockage IPFS, et smart contracts sur Polygon.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto bg-cyan-neon text-dark-blue hover:bg-cyan-light font-semibold px-8 h-12 text-base group">
                    Commencer gratuitement
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-cyan-neon/30 text-cyan-neon hover:bg-cyan-neon/10 px-8 h-12 text-base">
                    Se connecter
                  </Button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center gap-8 text-sm text-text-muted">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span>100% Décentralisé</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span>Open Source</span>
                </div>
              </div>
            </div>

            {/* Right visual */}
            <div className={`flex justify-center transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
              <HeroVisual />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 px-6 md:px-12 py-16 border-y border-glass-border/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 256, suffix: '-bit', label: 'Chiffrement AES' },
              { value: 100, suffix: '%', label: 'Décentralisé' },
              { value: 24, suffix: '/7', label: 'Disponibilité' },
              { value: 0, suffix: ' frais cachés', label: 'Transparence' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-cyan-neon mb-1">
                  {mounted && <AnimatedCounter value={stat.value} suffix={stat.suffix} />}
                </div>
                <div className="text-text-muted text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-6 md:px-12 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Deux solutions de <span className="text-cyan-neon">verrouillage</span>
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto text-body">
              Choisissez entre le verrouillage de fichiers ou de cryptomonnaies selon vos besoins
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* File Lock Card */}
            <div className="group relative p-8 rounded-3xl bg-gradient-to-br from-glass-surface/80 to-glass-surface/40 border border-glass-border/50 backdrop-blur-xl overflow-hidden hover:border-cyan-neon/50 transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-neon/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-cyan-neon/10 transition-colors" />

              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-neon/20 to-cyan-dark/20 border border-cyan-neon/30 flex items-center justify-center mb-6">
                  <FileText className="w-8 h-8 text-cyan-neon" strokeWidth={1.5} />
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">Files Blockchain</h3>
                <p className="text-text-secondary mb-6 text-body">
                  Chiffrez et verrouillez vos fichiers avec une date de déverrouillage précise.
                  Stockage décentralisé sur IPFS, chiffrement AES-256-GCM.
                </p>

                <ul className="space-y-3">
                  {[
                    'Chiffrement AES-256-GCM',
                    'Stockage IPFS via Pinata',
                    'Smart Contract immuable',
                    'Déchiffrement automatique'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-text-secondary text-body-sm">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Crypto Lock Card */}
            <div className="group relative p-8 rounded-3xl bg-gradient-to-br from-glass-surface/80 to-glass-surface/40 border border-glass-border/50 backdrop-blur-xl overflow-hidden hover:border-warning/50 transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-warning/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-warning/10 transition-colors" />

              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-warning/20 to-warning/10 border border-warning/30 flex items-center justify-center mb-6">
                  <Bitcoin className="w-8 h-8 text-warning" strokeWidth={1.5} />
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">TimeLock Crypto</h3>
                <p className="text-text-secondary mb-6 text-body">
                  Déployez des vaults personnels pour verrouiller vos cryptomonnaies
                  jusqu'à une date précise. Impossible à retirer avant l'échéance.
                </p>

                <ul className="space-y-3">
                  {[
                    'Vaults personnels (Factory Pattern)',
                    'Support multi-tokens ERC-20',
                    'Verrouillage MATIC natif',
                    'Retrait automatisé'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-text-secondary text-body-sm">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fees Section */}
      <section className="relative z-10 px-6 md:px-12 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-cyan-neon/10 to-cyan-dark/5 border border-cyan-neon/20 backdrop-blur-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-neon/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-neon/10 border border-cyan-neon/20 mb-4">
                  <BadgeDollarSign className="w-5 h-5 text-cyan-neon" />
                  <span className="text-cyan-neon text-sm font-medium">Frais transparents</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Des frais <span className="text-cyan-neon">ultra-compétitifs</span>
                </h2>
                <p className="text-text-secondary max-w-2xl mx-auto text-body">
                  Grâce à Polygon, verrouillez vos actifs pour quelques centimes seulement
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Fee card */}
                <div className="p-6 rounded-2xl bg-glass-surface/50 border border-glass-border/50 text-center hover:border-cyan-neon/30 transition-colors">
                  <div className="w-14 h-14 mx-auto rounded-xl bg-cyan-neon/10 border border-cyan-neon/20 flex items-center justify-center mb-4">
                    <Coins className="w-7 h-7 text-cyan-neon" />
                  </div>
                  <div className="text-4xl font-bold text-cyan-neon mb-2">~0.10€</div>
                  <div className="text-text-secondary text-sm">Coût moyen par lock</div>
                  <p className="text-text-muted text-xs mt-2">Gas fees Polygon inclus</p>
                </div>

                {/* Multi-crypto card */}
                <div className="p-6 rounded-2xl bg-glass-surface/50 border border-glass-border/50 text-center hover:border-cyan-neon/30 transition-colors">
                  <div className="w-14 h-14 mx-auto rounded-xl bg-cyan-light/10 border border-cyan-light/20 flex items-center justify-center mb-4">
                    <Bitcoin className="w-7 h-7 text-cyan-light" />
                  </div>
                  <div className="text-4xl font-bold text-cyan-light mb-2 flex items-center justify-center gap-1">
                    <Infinity className="w-8 h-8" />
                  </div>
                  <div className="text-text-secondary text-sm">Tokens supportés</div>
                  <p className="text-text-muted text-xs mt-2">MATIC + tous les ERC-20</p>
                </div>

                {/* No hidden fees */}
                <div className="p-6 rounded-2xl bg-glass-surface/50 border border-glass-border/50 text-center hover:border-cyan-neon/30 transition-colors">
                  <div className="w-14 h-14 mx-auto rounded-xl bg-cyan-dark/20 border border-cyan-dark/30 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-7 h-7 text-cyan-dark" />
                  </div>
                  <div className="text-4xl font-bold text-white mb-2">0%</div>
                  <div className="text-text-secondary text-sm">Frais de plateforme</div>
                  <p className="text-text-muted text-xs mt-2">Aucune commission TimeLock</p>
                </div>
              </div>

              <div className="mt-8 text-center">
                <p className="text-text-muted text-sm">
                  Verrouillez du MATIC natif, USDC, USDT, WETH, WBTC, et n'importe quel token ERC-20 sur Polygon
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="relative z-10 px-6 md:px-12 py-24 bg-gradient-to-b from-transparent via-glass-surface/20 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Sécurité de <span className="text-cyan-neon">niveau entreprise</span>
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto text-body">
              Une architecture robuste combinant les meilleures technologies de sécurité
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={Shield}
              title="Smart Contracts"
              description="Contrats vérifiés et immuables sur Polygon. Factory pattern pour isolation des fonds."
              delay={0}
            />
            <FeatureCard
              icon={Key}
              title="Chiffrement AES-256"
              description="Vos fichiers sont chiffrés avec AES-256-GCM et PBKDF2 pour la dérivation des clés."
              delay={100}
            />
            <FeatureCard
              icon={Globe}
              title="Stockage IPFS"
              description="Fichiers distribués sur le réseau IPFS via Pinata. Aucun point de défaillance unique."
              delay={200}
            />
            <FeatureCard
              icon={Zap}
              title="Polygon Network"
              description="Transactions rapides et économiques sur Polygon mainnet. Gas fees minimaux."
              delay={300}
            />
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="relative z-10 px-6 md:px-12 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-neon/10 border border-cyan-neon/20 mb-4">
              <ShieldCheck className="w-5 h-5 text-cyan-neon" />
              <span className="text-cyan-neon text-sm font-medium">Contrôle total</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Vos actifs restent <span className="text-cyan-neon">entre vos mains</span>
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto text-body">
              TimeLock ne prend jamais possession de vos fichiers ni de vos cryptomonnaies
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Self-custody */}
            <div className="relative p-8 rounded-2xl bg-glass-surface/40 border border-glass-border/50 backdrop-blur-xl">
              <div className="w-14 h-14 rounded-xl bg-cyan-neon/10 border border-cyan-neon/20 flex items-center justify-center mb-6">
                <Wallet className="w-7 h-7 text-cyan-neon" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Self-Custody</h3>
              <p className="text-text-secondary text-body-sm leading-relaxed">
                Vos cryptos sont verrouillées dans <strong className="text-white">votre propre vault</strong> déployé sur la blockchain.
                Aucun transfert vers TimeLock — l'argent reste dans votre wallet à tout moment.
              </p>
            </div>

            {/* No data retention */}
            <div className="relative p-8 rounded-2xl bg-glass-surface/40 border border-glass-border/50 backdrop-blur-xl">
              <div className="w-14 h-14 rounded-xl bg-cyan-neon/10 border border-cyan-neon/20 flex items-center justify-center mb-6">
                <Trash2 className="w-7 h-7 text-cyan-neon" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Aucune rétention</h3>
              <p className="text-text-secondary text-body-sm leading-relaxed">
                Vos fichiers sont chiffrés et stockés sur IPFS. Une fois supprimés de notre plateforme,
                <strong className="text-white"> nous ne conservons rien</strong>. Zéro trace, zéro copie.
              </p>
            </div>

            {/* Client-side encryption */}
            <div className="relative p-8 rounded-2xl bg-glass-surface/40 border border-glass-border/50 backdrop-blur-xl">
              <div className="w-14 h-14 rounded-xl bg-cyan-neon/10 border border-cyan-neon/20 flex items-center justify-center mb-6">
                <Lock className="w-7 h-7 text-cyan-neon" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Clés privées</h3>
              <p className="text-text-secondary text-body-sm leading-relaxed">
                Les clés de chiffrement sont dérivées de <strong className="text-white">votre mot de passe</strong>.
                Les transactions crypto sont signées par <strong className="text-white">votre wallet</strong>. Nous n'y avons jamais accès.
              </p>
            </div>
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-cyan-neon/5 border border-cyan-neon/20 text-center">
            <p className="text-text-secondary">
              <span className="text-cyan-neon font-semibold">100% non-custodial</span> — TimeLock est un outil, pas un intermédiaire.
              Vous gardez le contrôle total de vos actifs en toute circonstance.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-6 md:px-12 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Comment ça <span className="text-cyan-neon">fonctionne</span>
            </h2>
          </div>

          <div className="relative">
            {/* Connection line */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-neon/30 to-transparent hidden md:block" />

            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: '01', title: 'Connexion', desc: 'Connectez votre wallet ou créez un compte' },
                { step: '02', title: 'Sélection', desc: 'Choisissez fichier ou crypto à verrouiller' },
                { step: '03', title: 'Configuration', desc: 'Définissez la date de déverrouillage' },
                { step: '04', title: 'Verrouillage', desc: 'Transaction blockchain immuable' },
              ].map((item, i) => (
                <div key={i} className="relative text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-blue border-2 border-cyan-neon/50 flex items-center justify-center relative z-10">
                    <span className="text-cyan-neon font-bold">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-text-muted text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 md:px-12 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-12 rounded-3xl bg-gradient-to-br from-cyan-neon/10 to-cyan-dark/5 border border-cyan-neon/20 backdrop-blur-xl text-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-neon/10 via-transparent to-transparent" />

            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Prêt à sécuriser vos actifs ?
              </h2>
              <p className="text-text-secondary mb-8 max-w-xl mx-auto text-body">
                Rejoignez TimeLock et profitez de la puissance de la blockchain pour protéger
                vos fichiers et cryptomonnaies dans le temps.
              </p>

              <Link href="/register">
                <Button size="lg" className="bg-cyan-neon text-dark-blue hover:bg-cyan-light font-semibold px-10 h-14 text-lg group">
                  Créer un compte gratuitement
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 md:px-12 py-12 border-t border-glass-border/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="TimeLock"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span className="text-lg font-bold text-white">TimeLock</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-text-muted">
              <span>Projet BTS SIO SLAM</span>
              <span className="w-1 h-1 rounded-full bg-text-muted" />
              <div className="flex items-center gap-2">
                <Image
                  src="/polygon-matic-logo.png"
                  alt="Polygon"
                  width={16}
                  height={16}
                  className="w-4 h-4"
                />
                <span>Polygon Mainnet</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-text-muted" />
              <span>2026</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
