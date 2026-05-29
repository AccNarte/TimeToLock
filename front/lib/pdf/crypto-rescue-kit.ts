import jsPDF from 'jspdf';

/**
 * "Kit de récupération" PDF generated client-side after a crypto lock is
 * created. Contains every piece of information the user needs to withdraw
 * their funds even if TimeLock the website disappears tomorrow.
 *
 * The PDF doesn't contain any secret — withdrawing still requires the
 * owner's wallet signature on-chain. Losing the PDF doesn't lose the funds;
 * losing the wallet does.
 */

export interface CryptoRescueKitData {
  // Lock identification
  lockDbId: string | number;
  lockTitle?: string;

  // On-chain refs
  vaultAddress: string;
  ownerAddress: string;
  chainId: number;
  chainName: string;
  createTxHash?: string;

  // Token
  tokenSymbol: string;
  tokenName: string;
  isNative: boolean;
  tokenContractAddress?: string; // undefined for native
  tokenDecimals: number;

  // Amount
  amountFormatted: string; // e.g. "250.0"
  amountWei: string;       // e.g. "250000000000000000000"

  // Dates
  createdAt: Date;
  unlockAt: Date;
}

// Minimal vault ABI exposed in the PDF so the user can rebuild the call.
const VAULT_ABI_SNIPPET = [
  '[',
  '  {"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},',
  '  {"inputs":[],"name":"getStatus","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},',
  '  {"inputs":[],"name":"unlockTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},',
  '  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},',
  '  {"inputs":[],"name":"amount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}',
  ']',
].join('\n');

export function generateCryptoRescueKit(data: CryptoRescueKitData): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  // Layout constants
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const MARGIN = 56;
  const COL_W = W - MARGIN * 2;

  // Palette (sober, print-friendly — avoid white-on-white surprises)
  const COLORS = {
    ink: [15, 23, 42] as [number, number, number],         // slate-900
    mute: [100, 116, 139] as [number, number, number],     // slate-500
    soft: [148, 163, 184] as [number, number, number],     // slate-400
    accent: [79, 70, 229] as [number, number, number],     // indigo-600
    success: [16, 185, 129] as [number, number, number],   // emerald-500
    border: [226, 232, 240] as [number, number, number],   // slate-200
    surface: [248, 250, 252] as [number, number, number],  // slate-50
  };

  let y = MARGIN;
  let pageNumber = 1;

  const setRgb = (op: 'fill' | 'text' | 'draw', [r, g, b]: [number, number, number]) => {
    if (op === 'fill') doc.setFillColor(r, g, b);
    if (op === 'text') doc.setTextColor(r, g, b);
    if (op === 'draw') doc.setDrawColor(r, g, b);
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > H - MARGIN) {
      addFooter();
      doc.addPage();
      pageNumber += 1;
      y = MARGIN;
      addRunningHeader();
    }
  };

  const addRunningHeader = () => {
    setRgb('text', COLORS.mute);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('TIMELOCK · KIT DE RÉCUPÉRATION', MARGIN, MARGIN - 24);
    doc.text(`Lock #${data.lockDbId}`, W - MARGIN, MARGIN - 24, { align: 'right' });
    setRgb('draw', COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, MARGIN - 18, W - MARGIN, MARGIN - 18);
  };

  const addFooter = () => {
    setRgb('text', COLORS.soft);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      'Ce document n\'est pas un secret — sans la clé privée du wallet propriétaire, il ne permet à personne de retirer les fonds.',
      MARGIN,
      H - 30,
    );
    doc.text(String(pageNumber), W - MARGIN, H - 30, { align: 'right' });
  };

  const h1 = (text: string) => {
    setRgb('text', COLORS.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(text, MARGIN, y);
    y += 28;
  };

  const eyebrow = (text: string) => {
    setRgb('text', COLORS.accent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(text.toUpperCase(), MARGIN, y);
    y += 14;
  };

  const h2 = (text: string) => {
    ensureSpace(34);
    setRgb('text', COLORS.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(text, MARGIN, y);
    y += 18;
  };

  const para = (text: string, opts: { mute?: boolean; size?: number } = {}) => {
    const size = opts.size ?? 9.5;
    setRgb('text', opts.mute ? COLORS.mute : COLORS.ink);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, COL_W);
    ensureSpace(lines.length * (size * 1.4));
    doc.text(lines, MARGIN, y);
    y += lines.length * (size * 1.4) + 2;
  };

  const kv = (label: string, value: string, opts: { mono?: boolean; smallValue?: boolean } = {}) => {
    ensureSpace(22);
    // label
    setRgb('text', COLORS.mute);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(label.toUpperCase(), MARGIN, y);
    // value
    setRgb('text', COLORS.ink);
    doc.setFont(opts.mono ? 'courier' : 'helvetica', opts.mono ? 'normal' : 'bold');
    doc.setFontSize(opts.smallValue ? 8.5 : 10);
    const valueLines = doc.splitTextToSize(value, COL_W - 120);
    doc.text(valueLines, MARGIN + 120, y);
    const used = Math.max(12, valueLines.length * 11);
    y += used + 4;
    // hairline
    setRgb('draw', COLORS.border);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y - 2, W - MARGIN, y - 2);
    y += 6;
  };

  const orderedStep = (n: number, text: string) => {
    ensureSpace(28);
    // number badge
    setRgb('fill', COLORS.surface);
    setRgb('draw', COLORS.border);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y - 11, 18, 16, 3, 3, 'FD');
    setRgb('text', COLORS.accent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(String(n), MARGIN + 9, y + 0, { align: 'center' });
    // body
    setRgb('text', COLORS.ink);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, COL_W - 28);
    doc.text(lines, MARGIN + 26, y);
    y += Math.max(20, lines.length * 13);
  };

  const codeBlock = (text: string) => {
    const lines = text.split('\n');
    const lineHeight = 11;
    const blockHeight = lines.length * lineHeight + 12;
    ensureSpace(blockHeight + 8);
    setRgb('fill', COLORS.surface);
    setRgb('draw', COLORS.border);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y - 8, COL_W, blockHeight, 4, 4, 'FD');
    setRgb('text', COLORS.ink);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.5);
    lines.forEach((line, i) => {
      doc.text(line, MARGIN + 8, y + 4 + i * lineHeight);
    });
    y += blockHeight + 6;
  };

  const callout = (title: string, body: string, tone: 'info' | 'warn' = 'info') => {
    const tint = tone === 'warn' ? [254, 243, 199] as [number, number, number] : COLORS.surface;
    const border = tone === 'warn' ? [251, 191, 36] as [number, number, number] : COLORS.border;
    const bodyLines = doc.splitTextToSize(body, COL_W - 20);
    const height = 20 + bodyLines.length * 12;
    ensureSpace(height + 10);
    setRgb('fill', tint);
    setRgb('draw', border);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y - 8, COL_W, height, 4, 4, 'FD');
    setRgb('text', COLORS.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(title, MARGIN + 10, y + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setRgb('text', COLORS.mute);
    doc.text(bodyLines, MARGIN + 10, y + 14);
    y += height + 8;
  };

  // ========================================
  //  PAGE 1 — COVER
  // ========================================
  // Top accent bar
  setRgb('fill', COLORS.accent);
  doc.rect(0, 0, W, 4, 'F');

  y = MARGIN + 8;
  eyebrow('TimeLock · Kit de récupération');
  y += 4;
  h1('Récupère tes fonds');
  setRgb('text', COLORS.mute);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('même si TimeLock disparaît demain.', MARGIN, y);
  y += 28;

  para(
    `Ce document contient tout ce dont tu as besoin pour récupérer les fonds verrouillés dans ton vault TimeLock, indépendamment de notre site. Conserve-le précieusement — il n'est pas obligatoire (tes fonds sont sur la blockchain Polygon, toujours accessibles depuis ton wallet) mais il décrit la marche à suivre exacte.`,
    { mute: true, size: 9.5 },
  );

  y += 6;

  // Lock summary box on cover
  ensureSpace(140);
  setRgb('fill', COLORS.surface);
  setRgb('draw', COLORS.border);
  doc.setLineWidth(0.6);
  doc.roundedRect(MARGIN, y, COL_W, 130, 6, 6, 'FD');

  const innerX = MARGIN + 16;
  let innerY = y + 22;

  setRgb('text', COLORS.mute);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('MONTANT VERROUILLÉ', innerX, innerY);
  innerY += 6;
  setRgb('text', COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text(`${data.amountFormatted} ${data.tokenSymbol}`, innerX, innerY + 18);
  innerY += 38;

  setRgb('text', COLORS.mute);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('DÉVERROUILLAGE', innerX, innerY);
  setRgb('text', COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(formatHumanDate(data.unlockAt), innerX, innerY + 14);

  setRgb('text', COLORS.mute);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('RÉSEAU', innerX + 220, innerY);
  setRgb('text', COLORS.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${data.chainName} (${data.chainId})`, innerX + 220, innerY + 14);

  innerY += 30;
  setRgb('text', COLORS.mute);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('CONTRAT DU VAULT', innerX, innerY);
  setRgb('text', COLORS.ink);
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.text(data.vaultAddress, innerX, innerY + 12);

  y += 150;

  callout(
    'À conserver, pas à protéger',
    'Ce document n\'est pas un secret. Sans la clé privée de ton wallet propriétaire, personne ne peut retirer les fonds — même en possédant ce PDF. Tu peux l\'imprimer, l\'envoyer par email à toi-même, le stocker dans un drive, etc.',
    'info',
  );

  // ========================================
  //  PAGE 2 — RÉCAPITULATIF DÉTAILLÉ
  // ========================================
  addFooter();
  doc.addPage();
  pageNumber += 1;
  y = MARGIN;
  addRunningHeader();

  eyebrow('01 · Récapitulatif');
  h2('Détails complets du lock');
  y += 4;

  kv('Identifiant TimeLock', `#${data.lockDbId}`, { mono: true });
  kv('Type de lock', data.isNative ? `${data.tokenSymbol} natif` : `ERC-20 (${data.tokenSymbol})`);
  kv('Token', `${data.tokenName} — ${data.tokenSymbol}`);
  if (!data.isNative && data.tokenContractAddress) {
    kv('Adresse du token', data.tokenContractAddress, { mono: true, smallValue: true });
  }
  kv('Décimales', String(data.tokenDecimals), { mono: true });
  kv('Montant (lisible)', `${data.amountFormatted} ${data.tokenSymbol}`, { mono: true });
  kv('Montant (wei)', data.amountWei, { mono: true, smallValue: true });
  kv('Propriétaire', data.ownerAddress, { mono: true, smallValue: true });
  kv('Vault contract', data.vaultAddress, { mono: true, smallValue: true });
  kv('Réseau', `${data.chainName} — chainId ${data.chainId}`);
  kv('Créé le', formatHumanDate(data.createdAt));
  kv(
    'Déverrouillage',
    `${formatHumanDate(data.unlockAt)} — unix ${Math.floor(data.unlockAt.getTime() / 1000)}`,
  );
  if (data.createTxHash) {
    kv('Tx de création', data.createTxHash, { mono: true, smallValue: true });
  }

  // ========================================
  //  PAGE 3 — RETRAIT VIA POLYGONSCAN
  // ========================================
  doc.addPage();
  pageNumber += 1;
  y = MARGIN;
  addRunningHeader();

  eyebrow('02 · Retirer · méthode simple');
  h2('Via PolygonScan (sans aucun outil)');

  para(
    'Cette méthode marche tant que ton wallet (MetaMask, Rabby, etc.) est installé et que tu connais la phrase de récupération. Aucun terminal ni code à écrire.',
    { mute: true },
  );

  y += 6;

  orderedStep(
    1,
    `Ouvre dans ton navigateur : polygonscan.com/address/${data.vaultAddress}#writeContract`,
  );
  orderedStep(2, 'Connecte ton wallet en cliquant sur "Connect to Web3" en haut.');
  orderedStep(
    3,
    'Vérifie que ton adresse connectée correspond bien au "Propriétaire" indiqué ci-dessus.',
  );
  orderedStep(
    4,
    `Trouve la fonction "withdraw" dans la liste (elle ne prend aucun argument).`,
  );
  orderedStep(5, 'Clique sur le bouton "Write" puis confirme la transaction dans ton wallet.');
  orderedStep(
    6,
    `Une fois la transaction confirmée (~5 secondes sur Polygon), les fonds sont transférés vers ton adresse.`,
  );

  y += 6;
  callout(
    'Conditions de retrait',
    `Le contrat refuse tout retrait avant le ${formatHumanDate(data.unlockAt)}. Il refuse aussi tout retrait par une autre adresse que le propriétaire. Ces règles sont gravées dans le code du vault, immuables.`,
    'info',
  );

  // ========================================
  //  PAGE 4 — RETRAIT VIA ETHERS.JS
  // ========================================
  doc.addPage();
  pageNumber += 1;
  y = MARGIN;
  addRunningHeader();

  eyebrow('03 · Retirer · méthode dev');
  h2('Via Node.js + ethers.js');

  para(
    'Pour les utilisateurs techniques ou si PolygonScan est indisponible. Nécessite Node.js et la lib ethers v6.',
    { mute: true },
  );

  y += 6;
  para('Installation :', { size: 9 });
  codeBlock('npm install ethers');

  y += 2;
  para('Script de retrait :', { size: 9 });
  codeBlock(
    [
      `import { ethers } from 'ethers';`,
      ``,
      `const RPC = 'https://polygon-rpc.com';`,
      `const VAULT = '${data.vaultAddress}';`,
      `const PRIVATE_KEY = process.env.PRIVATE_KEY; // wallet du propriétaire`,
      ``,
      `const provider = new ethers.JsonRpcProvider(RPC);`,
      `const signer = new ethers.Wallet(PRIVATE_KEY, provider);`,
      ``,
      `// ABI minimal — voir page suivante`,
      `const abi = ['function withdraw() external'];`,
      `const vault = new ethers.Contract(VAULT, abi, signer);`,
      ``,
      `const tx = await vault.withdraw();`,
      `console.log('tx envoyée :', tx.hash);`,
      `await tx.wait();`,
      `console.log('retrait confirmé');`,
    ].join('\n'),
  );

  y += 6;
  callout(
    'Sécurité de la clé privée',
    'Ne hardcode JAMAIS ta clé privée dans le script. Passe-la par une variable d\'environnement, et exécute le script depuis une machine de confiance, sans logging actif.',
    'warn',
  );

  // ========================================
  //  PAGE 5 — ABI MINIMAL
  // ========================================
  doc.addPage();
  pageNumber += 1;
  y = MARGIN;
  addRunningHeader();

  eyebrow('04 · Référence');
  h2('ABI minimal du contrat-vault');

  para(
    'Voici l\'ABI strict minimum pour interagir avec ton vault. À copier-coller dans n\'importe quel outil compatible Ethereum (ethers.js, viem, web3.js, Remix, Foundry…).',
    { mute: true },
  );

  y += 6;
  codeBlock(VAULT_ABI_SNIPPET);

  y += 6;
  para('Adresse exacte du vault à utiliser :', { size: 9 });
  codeBlock(data.vaultAddress);

  y += 8;
  h2('Et après ?');
  para(
    'Une fois `withdraw()` exécuté avec succès, les fonds quittent le vault et arrivent dans ton wallet. Le vault devient "WITHDRAWN" et ne peut plus être réutilisé (les vaults sont à usage unique).',
  );
  para(
    'Tu peux vérifier le statut à tout moment via la fonction `getStatus()` (retourne 0=LOCKED, 1=UNLOCKABLE, 2=WITHDRAWN).',
    { mute: true },
  );

  // Final footer on last page
  addFooter();

  return doc.output('blob');
}

function formatHumanDate(d: Date): string {
  return d.toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Trigger a browser download of the generated PDF blob.
 */
export function downloadCryptoRescueKit(data: CryptoRescueKitData): void {
  const blob = generateCryptoRescueKit(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const filename = `timelock-rescue-${data.lockDbId}-${data.tokenSymbol}.pdf`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Free the blob URL after a tick to ensure the download started
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
