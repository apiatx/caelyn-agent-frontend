import { SidebarNavigation } from "./sidebar-navigation";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Sidebar Navigation */}
      <SidebarNavigation />
      
      {/* Main Content Area */}
      <div className="ml-64 min-h-screen">
        <main className="w-full">
          {children}
        </main>
      </div>
    </div>
  );
}