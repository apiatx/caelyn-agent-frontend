import { useState } from "react";
import { SidebarNavigation } from "./sidebar-navigation";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Sidebar Navigation */}
      <SidebarNavigation 
        isCollapsed={isCollapsed}
        onToggle={toggleSidebar}
      />
      
      {/* Main Content Area */}
      <div className={`min-h-screen transition-all duration-300 ease-in-out ${
        isCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        <main className="w-full">
          {children}
        </main>
      </div>
    </div>
  );
}