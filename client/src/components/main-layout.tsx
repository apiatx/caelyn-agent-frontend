import { useState } from "react";
import { SidebarNavigation } from "./sidebar-navigation";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
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
      />
      
      {/* Main Content Area */}
      <div className={`min-h-screen transition-all duration-300 ease-in-out ${
        isMobile 
          ? 'ml-0' 
          : isCollapsed 
            ? 'ml-16' 
            : 'ml-64'
      }`}>
        <main className="w-full">
          {children}
        </main>
      </div>
    </div>
  );
}