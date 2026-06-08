import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Wallet, LogOut, Crown, LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useState } from "react";

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

const AppSidebar = ({ tabs, activeTab, onTabChange }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const pages: PageItem[] = [
    { label: "Dashboard", icon: LayoutDashboard, to: "/" },
    { label: "Financeiro", icon: Wallet, to: "/financeiro" },
  ];

  return (
    <aside
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className={cn(
        "hidden lg:flex flex-col shrink-0 sticky top-0 h-screen z-40 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border-r border-white/[0.06] bg-gradient-to-b from-background/80 via-background/60 to-background/80 backdrop-blur-2xl",
        open ? "w-[240px]" : "w-[72px]"
      )}
    >
      {/* Ambient glow */}
      <div className="absolute top-1/4 -left-10 w-40 h-40 bg-primary/15 rounded-full blur-[80px] pointer-events-none" />

      {/* Logo */}
      <div className={cn(
        "relative h-16 flex items-center gap-3 border-b border-white/[0.06] shrink-0 transition-[padding] duration-300",
        open ? "px-4" : "px-3 justify-center"
      )}>
        <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-[0_8px_24px_-4px_hsl(var(--primary)/0.6),inset_0_1px_0_hsl(0_0%_100%/0.25)]">
          <span className="font-heading font-extrabold text-primary-foreground text-base leading-none">M</span>
        </div>
        {open && (
          <span className="font-heading font-extrabold text-foreground text-base tracking-wider whitespace-nowrap animate-fade-in">MIBUSCA</span>
        )}
      </div>

      {/* Scroll area */}
      <div className={cn(
        "relative flex-1 overflow-y-auto overflow-x-hidden scrollbar-none py-4 flex flex-col gap-4 transition-[padding] duration-300",
        open ? "px-3" : "px-2"
      )}>
        {/* Pages */}
        <div className="flex flex-col gap-1">
          {open && (
            <p className="px-3 mb-1 text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground/60 whitespace-nowrap animate-fade-in">Páginas</p>
          )}
          {pages.map((p) => {
            const Icon = p.icon;
            const isActive = location.pathname === p.to;
            return (
              <button
                key={p.label}
                onClick={() => navigate(p.to)}
                title={!open ? p.label : undefined}
                className={cn(
                  "group relative flex items-center h-11 rounded-xl text-[13px] font-semibold transition-colors duration-150 overflow-hidden",
                  open ? "gap-3 px-3 justify-start" : "justify-center px-0",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                )}
              >
                {isActive && (
                  <>
                    <span className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/70 rounded-xl shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.7)]" />
                    <span className="absolute inset-0 rounded-xl border border-white/15" />
                  </>
                )}
                <Icon className="relative w-[18px] h-[18px] shrink-0" strokeWidth={2} />
                {open && (
                  <span className="relative whitespace-nowrap animate-fade-in">{p.label}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Section tabs - only when open */}
        {tabs && tabs.length > 0 && open && (
          <div className="flex flex-col gap-0.5 animate-fade-in">
            <p className="px-3 mb-1 text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground/60 whitespace-nowrap">Seções</p>
            {tabs.map((t) => {
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => onTabChange?.(t.key)}
                  className={cn(
                    "group relative flex items-center justify-between gap-2 h-9 px-3 rounded-lg text-[12px] font-semibold transition-colors duration-150 overflow-hidden whitespace-nowrap",
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  )}
                >
                  {isActive && (
                    <>
                      <span className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/60 rounded-lg shadow-[0_6px_18px_-6px_hsl(var(--primary)/0.6)]" />
                      <span className="absolute inset-0 rounded-lg border border-white/10" />
                    </>
                  )}
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
                          ? "bg-white/20 text-primary-foreground"
                          : "bg-white/[0.05] text-muted-foreground border border-white/[0.06]"
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

      {/* Premium card */}
      <div className={cn(
        "relative mb-2 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent border border-primary/25 backdrop-blur-xl overflow-hidden transition-all duration-300",
        open ? "mx-3 p-3" : "mx-2 p-2"
      )}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.25),transparent_60%)] pointer-events-none" />
        <div className={cn("relative flex items-center gap-3", !open && "justify-center")}>
          <div className="w-9 h-9 shrink-0 rounded-xl bg-primary/40 border border-white/15 flex items-center justify-center shadow-inner">
            <Crown className="w-4 h-4 text-primary-foreground" />
          </div>
          {open && (
            <div className="min-w-0 animate-fade-in">
              <p className="text-[12px] font-bold text-foreground leading-tight whitespace-nowrap">Plano Premium</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 whitespace-nowrap">Recursos exclusivos</p>
            </div>
          )}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => { logout(); navigate("/login"); }}
        title={!open ? "Sair" : undefined}
        className={cn(
          "relative mb-3 flex items-center h-11 rounded-xl text-[13px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
          open ? "mx-3 gap-3 px-3 justify-start" : "mx-2 justify-center"
        )}
      >
        <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
        {open && <span className="whitespace-nowrap animate-fade-in">Sair</span>}
      </button>
    </aside>
  );
};

export default AppSidebar;
