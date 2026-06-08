import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Wallet, LogOut, LucideIcon, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { memo, useState } from "react";
import logo from "@/assets/mibusca-logo.png";

export type SidebarTab = {
  key: string;
  label: string;
  badge?: number | string | null;
  badges?: { label: string; tone: "ifood" | "99food" }[];
};

type Props = {
  tabs?: SidebarTab[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
};

type PageItem = {
  label: string;
  icon: LucideIcon;
  to: string;
};

const AppSidebar = memo(({ tabs, activeTab, onTabChange }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const pages: PageItem[] = [
    { label: "Dashboard", icon: LayoutDashboard, to: "/" },
    { label: "Financeiro", icon: Wallet, to: "/financeiro" },
  ];

  // On mobile drawer open, force expanded layout
  const expanded = open || mobileOpen;

  return (
    <>
      {/* Mobile/tablet trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-[60] w-11 h-11 rounded-xl bg-card border border-white/15 shadow-lg flex items-center justify-center text-foreground"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-background/70 backdrop-blur-sm animate-fade-in"
        />
      )}

      <aside
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={cn(
          "fixed inset-y-0 left-0 h-screen z-[70] py-3 pl-3 flex shrink-0 will-change-[width,transform]",
          "transition-[width,transform] duration-200 ease-out w-[280px] md:translate-x-0",
          expanded ? "pr-3" : "pr-0",
          expanded ? "md:w-[280px]" : "md:w-[68px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
      <div className={cn(
        "relative flex flex-col overflow-hidden bg-card border border-white/10 shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.35)]",
        expanded ? "w-full rounded-[24px]" : "w-14 rounded-[18px]"
      )}>

        {/* Logo */}
        <div className={cn(
          "relative h-[68px] flex items-center gap-3 shrink-0 transition-[padding] duration-200",
          expanded ? "px-5" : "justify-center px-0"
        )}>
          <img src={logo} alt="MIBUSCA" className="w-11 h-11 object-contain shrink-0 drop-shadow-[0_8px_18px_hsl(var(--primary)/0.45)]" />
          {expanded && (
            <div className="animate-fade-in min-w-0">
              <h2 className="font-heading font-extrabold text-foreground text-[15px] leading-none tracking-[0.18em] whitespace-nowrap">MIBUSCA</h2>
              <p className="text-[9px] text-muted-foreground tracking-[0.3em] uppercase mt-1.5 whitespace-nowrap font-semibold">Painel</p>
            </div>
          )}
        </div>

        {/* Scroll area */}
        <div className={cn("relative flex-1 overflow-y-auto overflow-x-hidden scrollbar-none py-4 flex flex-col gap-4", expanded ? "px-3" : "px-0")}>
          {/* Pages */}
          <div className="flex flex-col gap-1">
            {expanded && (
              <p className="px-3 mb-1 text-[9px] font-bold tracking-[0.25em] uppercase text-muted-foreground/70 whitespace-nowrap animate-fade-in">
                Navegação
              </p>
            )}
            {pages.map((p) => {
              const Icon = p.icon;
              const isActive = location.pathname === p.to;
              return (
                <button
                  key={p.label}
                  onClick={() => navigate(p.to)}
                  title={!expanded ? p.label : undefined}
                  className={cn(
                    "group relative flex items-center h-11 rounded-xl text-[13px] font-semibold transition-all duration-300 overflow-hidden",
                    expanded ? "gap-3 px-3 justify-start" : "justify-center w-11 mx-auto",
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                  )}
                >
                  {isActive && (
                    <>
                      <span className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-xl shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6),inset_0_1px_0_hsl(0_0%_100%/0.25)]" />
                      <span className="absolute inset-0 rounded-xl border border-white/15" />
                    </>
                  )}
                  <Icon className="relative w-[18px] h-[18px] shrink-0" strokeWidth={2.2} />
                  {expanded && <span className="relative whitespace-nowrap animate-fade-in">{p.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Section tabs */}
          {tabs && tabs.length > 0 && expanded && (
            <div className="flex flex-col gap-0.5 animate-fade-in">
              <p className="px-3 mb-1 text-[9px] font-bold tracking-[0.25em] uppercase text-muted-foreground/70 whitespace-nowrap">
                Seções
              </p>
              {tabs.map((t) => {
                const isActive = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => onTabChange?.(t.key)}
                    className={cn(
                      "group relative flex items-center justify-between gap-2 h-9 px-3 rounded-lg text-[12px] font-semibold transition-all duration-200 overflow-hidden whitespace-nowrap",
                      isActive
                        ? "text-primary-foreground bg-gradient-to-r from-primary/90 to-accent/70 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.2)] border border-white/15"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05] border border-transparent"
                    )}
                  >
                    <span className="relative flex items-center gap-1.5 min-w-0 truncate">
                      <span className="truncate">{t.label}</span>
                      {t.badges?.map((b) => (
                        <span
                          key={b.label}
                          className={cn(
                            "text-[8px] px-1 py-0.5 rounded-md font-bold border shrink-0",
                            b.tone === "ifood"
                              ? "bg-destructive/15 text-destructive border-destructive/30"
                              : "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30"
                          )}
                        >
                          {b.label}
                        </span>
                      ))}
                    </span>
                    {t.badge !== undefined && t.badge !== null && (
                      <span
                        className={cn(
                          "relative text-[10px] px-1.5 py-0.5 rounded-md font-bold tabular-nums shrink-0",
                          isActive
                            ? "bg-white/25 text-primary-foreground"
                            : "bg-white/[0.06] text-muted-foreground"
                        )}
                      >
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate("/login"); }}
          title={!expanded ? "Sair" : undefined}
          className={cn(
            "relative mb-3 flex items-center h-11 rounded-xl text-[13px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all duration-200",
            expanded ? "mx-3 gap-3 px-3 justify-start" : "mx-auto w-11 justify-center"
          )}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={2.2} />
          {expanded && <span className="whitespace-nowrap animate-fade-in">Sair</span>}
        </button>

        {/* Mobile close */}
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden absolute top-3 right-3 w-9 h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-foreground"
            aria-label="Fechar menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
    </>
  );
});

AppSidebar.displayName = "AppSidebar";

export default AppSidebar;
