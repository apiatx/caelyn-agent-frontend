import { useState, useEffect, useRef, useCallback } from "react";
import { SidebarNavigation } from "./sidebar-navigation";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: React.ReactNode;
}

const COLLAPSED_W = 64;
const EXPANDED_W = 192;
const SNAP_THRESHOLD = 128;
const MIN_DRAG = 48;
const MAX_DRAG = 320;

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const [width, setWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sidebar_width');
      const n = saved ? parseInt(saved, 10) : EXPANDED_W;
      return Number.isFinite(n) ? Math.max(COLLAPSED_W, Math.min(MAX_DRAG, n)) : EXPANDED_W;
    } catch { return EXPANDED_W; }
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{ startX: number; startW: number } | null>(null);

  const isCollapsed = width < SNAP_THRESHOLD;

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    }
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const beginDrag = useCallback((clientX: number) => {
    dragStateRef.current = { startX: clientX, startW: width };
    setIsDragging(true);
  }, [width]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const s = dragStateRef.current;
      if (!s) return;
      const next = Math.max(MIN_DRAG, Math.min(MAX_DRAG, s.startW + (e.clientX - s.startX)));
      setWidth(next);
    };
    const onUp = () => {
      setIsDragging(false);
      setWidth(prev => {
        const snapped = prev < SNAP_THRESHOLD ? COLLAPSED_W : EXPANDED_W;
        try { localStorage.setItem('sidebar_width', String(snapped)); } catch {}
        return snapped;
      });
      dragStateRef.current = null;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [isDragging]);

  useEffect(() => {
    if (isMobile && isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, isMobileMenuOpen]);

  return (
    <div className="min-h-screen text-white" style={{ background: '#050608' }}>
      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar Navigation */}
      <SidebarNavigation
        isCollapsed={isCollapsed}
        isMobile={isMobile}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggle={toggleSidebar}
        onCloseMobile={closeMobileMenu}
        width={width}
        onBeginDrag={beginDrag}
        isDragging={isDragging}
      />

      {/* Main Content Area */}
      <div
        className="min-h-screen"
        style={{
          marginLeft: isMobile ? 0 : width,
          paddingTop: isMobile ? 56 : 0,
          transition: isDragging ? 'none' : 'margin-left 0.2s ease-in-out',
        }}
      >
        <main className="w-full">{children}</main>
      </div>
    </div>
  );
}
