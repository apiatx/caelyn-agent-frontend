import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getIframeSandbox, sanitizeUrl } from '@/utils/security';

const DEFAULT_ALLOW = 'clipboard-read; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
const DEFAULT_REFERRER_POLICY = 'strict-origin-when-cross-origin';

interface LazyIframeProps {
  src: string;
  title: string;
  className?: string;
  sandbox?: string;
  allow?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  onLoad?: () => void;
}

export function LazyIframe({
  src,
  title,
  className = '',
  sandbox,
  allow = DEFAULT_ALLOW,
  referrerPolicy = DEFAULT_REFERRER_POLICY,
  onLoad,
}: LazyIframeProps) {
  const securityProps = useMemo(() => {
    const sanitizedUrl = sanitizeUrl(src);
    if (!sanitizedUrl) {
      return { isBlocked: true, sandbox: '', sanitizedSrc: '' };
    }
    const effectiveSandbox = sandbox ?? getIframeSandbox(sanitizedUrl);
    return { isBlocked: false, sandbox: effectiveSandbox, sanitizedSrc: sanitizedUrl };
  }, [src, sandbox]);
  
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const handleManualLoad = useCallback(() => {
    setShouldLoad(true);
  }, []);

  const openInNewTab = useCallback(() => {
    window.open(src, '_blank', 'noopener,noreferrer');
  }, [src]);

  if (securityProps.isBlocked) {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-crypto-dark/50 backdrop-blur-sm rounded-lg border border-red-500/20">
          <div className="text-center p-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <ExternalLink className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-red-400 text-sm mb-2">Domain not whitelisted</p>
            <p className="text-crypto-silver text-xs mb-4">This content is blocked for security</p>
            <Button
              variant="outline"
              size="sm"
              onClick={openInNewTab}
              className="bg-white/5 border-crypto-silver/30 hover:bg-white/10"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {!shouldLoad && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-crypto-dark/50 backdrop-blur-sm rounded-lg border border-crypto-silver/20">
          <div className="text-center p-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
              <ExternalLink className="w-6 h-6 text-crypto-silver" />
            </div>
            <p className="text-crypto-silver text-sm mb-4">Scroll to load content</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualLoad}
              className="bg-white/5 border-crypto-silver/30 hover:bg-white/10"
            >
              Load Now
            </Button>
          </div>
        </div>
      )}

      {shouldLoad && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-crypto-dark/50 backdrop-blur-sm rounded-lg">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-crypto-green animate-spin" />
            <span className="text-crypto-silver text-sm">Loading...</span>
          </div>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-crypto-dark/50 backdrop-blur-sm rounded-lg border border-red-500/20">
          <div className="text-center p-6">
            <p className="text-red-400 text-sm mb-4">Failed to load content</p>
            <Button
              variant="outline"
              size="sm"
              onClick={openInNewTab}
              className="bg-white/5 border-crypto-silver/30 hover:bg-white/10"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      )}

      {shouldLoad && (
        <iframe
          src={securityProps.sanitizedSrc}
          title={title}
          className={`w-full h-full rounded-lg border border-crypto-silver/20 ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          frameBorder="0"
          loading="lazy"
          sandbox={securityProps.sandbox}
          allow={allow}
          referrerPolicy={referrerPolicy}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}

interface TabbedIframeContainerProps {
  tabs: {
    id: string;
    label: string;
    src: string;
    title: string;
    icon?: React.ReactNode;
  }[];
  defaultTab?: string;
  iframeHeight?: string;
  sandbox?: string;
  allow?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}

export function TabbedIframeContainer({
  tabs,
  defaultTab,
  iframeHeight = 'h-[600px]',
  sandbox,
  allow = DEFAULT_ALLOW,
  referrerPolicy = DEFAULT_REFERRER_POLICY,
}: TabbedIframeContainerProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setLoadedTabs((prev) => new Set(prev).add(tabId));
  }, []);

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-4 border-b border-crypto-silver/20 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-crypto-green/20 text-crypto-green border border-crypto-green/30'
                : 'bg-white/5 text-crypto-silver hover:bg-white/10 hover:text-white border border-transparent'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className={`w-full ${iframeHeight}`}>
        {activeTabData && (
          <LazyIframe
            key={activeTabData.id}
            src={activeTabData.src}
            title={activeTabData.title}
            className="w-full h-full"
            sandbox={sandbox}
            allow={allow}
            referrerPolicy={referrerPolicy}
          />
        )}
      </div>
    </div>
  );
}
