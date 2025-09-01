/**
 * Security utilities for XSS protection and safe iframe handling
 */

// Comprehensive XSS-safe iframe sandbox attributes
export const SECURE_IFRAME_SANDBOX = "allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation allow-presentation";

// Stricter sandbox for untrusted content
export const STRICT_IFRAME_SANDBOX = "allow-scripts allow-forms allow-popups";

// Content Security Policy for iframes
export const IFRAME_CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' https:; object-src 'none'; media-src 'self' https:; frame-ancestors 'none';";

// Trusted domains for our application
const TRUSTED_DOMAINS = [
  'dexscreener.com',
  'taostats.io',
  'swordscan.com',
  'taohub.info',
  'hyperliquid.xyz',
  'hyperfolio.xyz',
  'backprop.finance',
  'taomarketcap.com',
  'tradingview.com',
  'opensea.io',
  'checkr.social',
  'terminal.co',
  'www.terminal.co',
  'zoracle.xyz',
  'www.zoracle.xyz',
  'zora.co',
  'www.zora.co',
  'blockcreeper.com',
  'www.blockcreeper.com',
  'virtuals.io',
  'app.virtuals.io',
  'creator.bid',
  'bankr.bot',
  'peapods.finance',
  'app.hyperliquid.xyz',
  'hyperdash.info',
  'app.hyperswap.exchange',
  'liquidlaunch.app',
  'artemis.xyz',
  'app.artemisanalytics.com',
  'artemisanalytics.com',
  'nansen.ai',
  'app.nansen.ai',
  'chainlyze.ai',
  'app.chainlyze.ai',
  'dune.com',
  'tokenterminal.com',
  'chainspect.app',
  'x.com',
  'twitter.com',
  't.me',
  'telegram.me',
  'ethereum-ecosystem.com',
  'swissborg.com',
  'base.org',
  'chatgpt.com',
  'bubblemaps.io',
  'kolytics.com',
  'kaito.ai',
  'cookie.fun',
  'mindshare.elfi.ai',
  'velvet.capital',
  'cointelegraph.com',
  'coinmarketcap.com',
  'coingecko.com',
  'www.coingecko.com',
  'jup.ag',
  'mobyscreener.com',
  'web3.okx.com',
  'app.relay.link',
  'aerodrome.finance',
  'app.uniswap.org',
  'polymarket.com',
  'app.elfa.ai',
  'elfa.ai',
  'ayaoracle.xyz',
  'indexy.xyz',
  'debank.com',
  'www.relay.link',
  'relay.link',
  'universalx.app',
  'defi.instadapp.io',
  'ave.ai',
  'o1.exchange',
  'app.swing.xyz',
  'macroedge.ai',
  'app.aave.com',
  'senpi.ai',
  'www.aixvc.io',
  'aixvc.io',
  'app.arma.xyz',
  'arma.xyz',
  'zyf.ai',
  'lido.fi',
  'app.coinmarketman.com',
  'coinmarketman.com',
  'velo.xyz',
  'simplywall.st',
  'client.schwab.com',
  'unusualwhales.com',
  'newhedge.io',
  'portal.abs.xyz',
  'abs.xyz',
  'pudgyinvest.com',
  'thenew.money',
  'stocktwits.com',
  'www.stocktwits.com',
  'app.intellectia.ai',
  'intellectia.ai',
  'investing.com',
  'www.investing.com',
  'quanto.trade',
  'perps.saros.xyz',
  'saros.xyz',
  'degenai.dev',
  'messari.io',
  'perps.raydium.io',
  'raydium.io',
  'pro.edgex.exchange',
  'edgex.exchange',
  'trade.perpsdao.xyz',
  'perpsdao.xyz',
  'deri.io',
  'www.hegic.co',
  'hegic.co',
  'indexy.xyz',
  'www.tarot.to',
  'tarot.to',
  'arcadia.finance',
  'mamo.bot',
  'quant.fun',
  'www.ourbit.com',
  'ourbit.com',
  'limitless.exchange',
  'morpho.org',
  'www.ether.fi',
  'ether.fi',
  'wallet.coinbase.com',
  'app.teller.org',
  'app.seamlessprotocol.com',
  'app.lotusfinance.io',
  'app.spectra.finance'
];

/**
 * Validates if a URL is from a trusted domain
 */
export function isTrustedDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    return TRUSTED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * Sanitizes a URL to prevent XSS attacks
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Only allow https and http protocols
    if (!['https:', 'http:'].includes(urlObj.protocol)) {
      console.warn(`Blocked non-HTTP(S) protocol: ${urlObj.protocol}`);
      return null;
    }
    
    // Check if domain is trusted
    if (!isTrustedDomain(url)) {
      console.warn(`Blocked untrusted domain: ${urlObj.hostname}`);
      return null;
    }
    
    return urlObj.toString();
  } catch (error) {
    console.error('Invalid URL format:', url, error);
    return null;
  }
}

/**
 * Secure wrapper for opening links in new tabs
 */
export function openSecureLink(url: string): void {
  const sanitizedUrl = sanitizeUrl(url);
  
  if (!sanitizedUrl) {
    console.error('Blocked potentially unsafe URL:', url);
    alert('This link has been blocked for security reasons.');
    return;
  }
  
  // Open with security attributes in new tab (not window)
  const newWindow = window.open(
    sanitizedUrl,
    '_blank'
  );
  
  // Additional security: ensure the new window can't access opener
  if (newWindow) {
    newWindow.opener = null;
  }
}

/**
 * Gets appropriate sandbox attributes based on domain trust level
 */
export function getIframeSandbox(url: string): string {
  const sanitizedUrl = sanitizeUrl(url);
  
  if (!sanitizedUrl) {
    return STRICT_IFRAME_SANDBOX;
  }
  
  // Use stricter sandbox for less trusted domains
  try {
    const urlObj = new URL(sanitizedUrl);
    const hostname = urlObj.hostname.toLowerCase();
    
    // More permissive for our core trusted platforms
    const coreTrustedDomains = [
      'dexscreener.com',
      'tradingview.com',
      'hyperliquid.xyz',
      'taostats.io'
    ];
    
    if (coreTrustedDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    )) {
      return SECURE_IFRAME_SANDBOX;
    }
  } catch {
    // Invalid URL, use strict sandbox
  }
  
  return STRICT_IFRAME_SANDBOX;
}

/**
 * Common iframe security props
 */
export function getSecureIframeProps(src: string, title: string) {
  const sanitizedSrc = sanitizeUrl(src);
  
  if (!sanitizedSrc) {
    throw new Error(`Unsafe iframe source blocked: ${src}`);
  }
  
  return {
    src: sanitizedSrc,
    title,
    frameBorder: "0",
    loading: "lazy" as const,
    sandbox: getIframeSandbox(sanitizedSrc),
    referrerPolicy: "strict-origin-when-cross-origin" as const,
    allow: "clipboard-read; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
    className: "w-full rounded-lg border border-crypto-silver/20"
  };
}

/**
 * Validates and sanitizes external link props
 */
export function getSecureLinkProps(href: string) {
  const sanitizedHref = sanitizeUrl(href);
  
  if (!sanitizedHref) {
    throw new Error(`Unsafe link blocked: ${href}`);
  }
  
  return {
    href: sanitizedHref,
    target: "_blank" as const,
    rel: "noopener noreferrer nofollow",
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      openSecureLink(sanitizedHref);
    }
  };
}