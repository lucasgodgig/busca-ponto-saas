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
  LogOut,
  MapPin
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
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      title: "Home",
      icon: Home,
      href: "/app",
    },
    {
      title: "Mapa Interativo",
      icon: Map,
      href: "/mapa?reset=" + Date.now(), // Adiciona timestamp para forçar reset
    },
    {
      title: "Meus Estudos",
      icon: FileText,
      href: "/meus-estudos",
    },
    {
      title: "Histórico",
      icon: Clock,
      href: "/history",
    },
    {
      title: "Configurações",
      icon: Settings,
      href: "/configuracoes",
    },
    {
      title: "Pontos Comerciais",
      icon: MapPin,
      href: "/pontos-comerciais",
    },
  ];

  // Adicionar Admin BP se for admin_bp ou analyst_bp ou admin
  if (user?.role === "admin_bp" || user?.role === "analyst_bp" || user?.role === "admin") {
    if (user?.role === "admin_bp" || user?.role === "analyst_bp") {
      menuItems.push({
        title: "Admin BP",
        icon: Shield,
        href: "/admin-bp",
      });
      menuItems.push({
        title: "Solicitações",
        icon: FileText,
        href: "/admin-bp/solicitacoes",
      });
      menuItems.push({
        title: "Pontos Comerciais",
        icon: FileText,
        href: "/admin-bp/pontos-comerciais",
      });
    }
  }

  const isActive = (href: string) => {
    const currentPath = location.split("?")[0];
    if (href === "/app") {
      return currentPath === "/app" || currentPath === "/";
    }
    return currentPath.startsWith(href);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b z-50 flex items-center justify-between px-4">
        <Link href="/app" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
          <span className="font-bold text-lg">{APP_TITLE}</span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBadge />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleTheme()}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-background border-r transition-transform duration-300 z-40",
          "lg:translate-x-0 lg:w-64",
          isOpen ? "translate-x-0 w-64" : "-translate-x-full",
          className
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b">
          <div className="flex items-center gap-2">
            {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
            <span className="font-bold text-lg">{APP_TITLE}</span>
          </div>
          <NotificationBadge />
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  isActive(item.href) && "bg-primary/10 text-primary hover:bg-primary/20"
                )}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Theme Toggle */}
        <div className="p-4 border-t space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-5 w-5" />
                Tema Claro
              </>
            ) : (
              <>
                <Moon className="h-5 w-5" />
                Tema Escuro
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 text-destructive hover:text-destructive"
            onClick={logout}
          >
            <LogOut className="h-5 w-5" />
            Sair
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

