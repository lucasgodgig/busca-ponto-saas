import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Map, 
  FileText, 
  Clock, 
  Settings,
  Menu,
  X,
  Moon,
  Sun,
  Shield,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_LOGO, APP_TITLE } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import NotificationBadge from "./NotificationBadge";
import { useAuth } from "@/_core/hooks/useAuth";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      title: "Home",
      icon: Home,
      href: "/app",
      badge: 0,
    },
    {
      title: "Mapa Interativo",
      icon: Map,
      href: "/mapa?reset=" + Date.now(),
      badge: 0,
    },
    {
      title: "Meus Estudos",
      icon: FileText,
      href: "/meus-estudos",
      badge: 3,
    },
    {
      title: "Histórico",
      icon: Clock,
      href: "/history",
      badge: 5,
    },
    {
      title: "Configurações",
      icon: Settings,
      href: "/configuracoes",
      badge: 0,
    },
  ];

  // Adicionar Admin BP se for admin_bp ou analyst_bp
  if (user?.role === "admin_bp" || user?.role === "analyst_bp") {
    menuItems.push({
      title: "Admin BP",
      icon: Shield,
      href: "/admin-bp",
      badge: 0,
    });
    menuItems.push({
      title: "Solicitações",
      icon: FileText,
      href: "/admin-bp/solicitacoes",
      badge: 2,
    });
  }

  const isActive = (href: string) => {
    if (href === "/app") {
      return location === "/app" || location === "/";
    }
    return location.startsWith(href);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar text-sidebar-foreground border-b border-sidebar-border z-50 flex items-center justify-between px-4 shadow-md">
        <div className="flex items-center gap-2">
          {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8 brightness-0 invert" />}
          <span className="font-bold text-lg">{APP_TITLE}</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBadge />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="text-sidebar-foreground hover:bg-sidebar-primary/20"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-300 z-40 shadow-xl",
          "lg:translate-x-0 lg:w-64",
          isOpen ? "translate-x-0 w-64" : "-translate-x-full",
          className
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border bg-sidebar-primary/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8 brightness-0 invert" />}
            <span className="font-bold text-lg text-sidebar-foreground">{APP_TITLE}</span>
          </div>
          <NotificationBadge />
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-primary/20 transition-all duration-200 rounded-lg",
                  isActive(item.href) && "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90 font-semibold shadow-md"
                )}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1 text-left text-sm font-medium">{item.title}</span>
                {item.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold ml-auto flex-shrink-0">
                    {item.badge}
                  </span>
                )}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Theme Toggle & Logout */}
        <div className="p-4 border-t border-sidebar-border space-y-2 bg-sidebar-primary/10">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-primary/30 transition-colors rounded-lg"
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium">Tema Claro</span>
              </>
            ) : (
              <>
                <Moon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium">Tema Escuro</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-red-500/20 hover:text-red-300 transition-colors rounded-lg"
            onClick={logout}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">Sair</span>
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

