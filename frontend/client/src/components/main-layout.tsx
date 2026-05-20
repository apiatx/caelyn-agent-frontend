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
const MAX_DRAG = EXPANDED_W;
// How many pixels of movement before we treat it as a real drag (not a click)
const DRAG_THRESHOLD = 5;

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
  const dragStateRef = useRef<{ startX: number; startW: number; hasDragged: boolean } | null>(null);

  const isCollapsed = width < SNAP_THRESHOLD;

  const snapWidth = useCallback((w: number) => {
    const snapped = w < SNAP_THRESHOLD ? COLLAPSED_W : EXPANDED_W;
    try { localStorage.setItem('sidebar_width', String(snapped)); } catch {}
    return snapped;
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setIsMobileMenuOpen(prev => !prev);
    } else {
      // Desktop: snap to the opposite state and persist
      setWidth(prev => {
        const next = prev < SNAP_THRESHOLD ? EXPANDED_W : COLLAPSED_W;
        try { localStorage.setItem('sidebar_width', String(next)); } catch {}
        return next;
      });
    }
  }, [isMobile]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const beginDrag = useCallback((clientX: number) => {
    dragStateRef.current = { startX: clientX, startW: width, hasDragged: false };
    setIsDragging(true);
  }, [width]);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      const s = dragStateRef.current;
      if (!s) return;
      const delta = Math.abs(e.clientX - s.startX);
      if (delta > DRAG_THRESHOLD) s.hasDragged = true;
      if (s.hasDragged) {
        const next = Math.max(MIN_DRAG, Math.min(MAX_DRAG, s.startW + (e.clientX - s.startX)));
        setWidth(next);
      }
    };

    const onUp = () => {
      const s = dragStateRef.current;
      setIsDragging(false);
      dragStateRef.current = null;
      if (s && !s.hasDragged) {
        // Pure click on the drag handle → toggle
        setWidth(prev => {
          const next = prev < SNAP_THRESHOLD ? EXPANDED_W : COLLAPSED_W;
          try { localStorage.setItem('sidebar_width', String(next)); } catch {}
          return next;
        });
      } else {
        // Real drag → snap to nearest
        setWidth(prev => snapWidth(prev));
      }
    };

    // End drag immediately if mouse exits the browser viewport.
    // Without this, mouseup never fires off-screen and re-entering from
    // the opposite edge snaps the sidebar wide open.
    const onViewportLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) onUp();
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('mouseleave', onViewportLeave);

    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', onViewportLeave);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [isDragging, snapWidth]);

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
