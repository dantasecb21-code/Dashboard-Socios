import { useEffect, useState, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Wallet, LogOut, LucideIcon, Menu, X, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import logo from "@/assets/mibusca-logo.png";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type SidebarTab = {
  key: string;
  label: string;
  badge?: number | string | null;
  badges?: { label: string; tone: "ifood" | "99food" }[];
};

export type SidebarGroup = {
  label: string;
  tabs: SidebarTab[];
};

type Props = {
  groups?: SidebarGroup[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onPageChange?: (to: string) => void;
};

type PageItem = {
  label: string;
  icon: LucideIcon;
  to: string;
};

const pages: PageItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { label: "Financeiro", icon: Wallet, to: "/financeiro" },
];

const AppSidebar = memo(({ groups, activeTab, onTabChange, onPageChange }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const expanded = open || mobileOpen;

  useEffect(() => {
    if (!groups || !activeTab) return;
    const group = groups.find((g) => g.tabs.some((t) => t.key === activeTab));
    if (group) {
      setExpandedGroups((prev) => ({ ...prev, [group.label]: true }));
    }
  }, [activeTab, groups]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // Classes de transição de opacidade — evita saltos durante a animação de largura
  const fadeIn = "transition-opacity duration-150";
  const visible = expanded ? "opacity-100" : "opacity-0 pointer-events-none select-none";

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile trigger */}
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
          "transition-[width,transform] duration-200 ease-out",
          expanded ? "pr-3 w-[280px]" : "pr-0 md:w-[68px] w-[280px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div
          className={cn(
            "relative flex flex-col overflow-hidden bg-card border border-white/10",
            "shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.35)]",
            "transition-[border-radius] duration-200",
            expanded ? "w-full rounded-[24px]" : "w-14 rounded-[18px]"
          )}
        >
          {/* Logo — padding faz transição, texto faz fade */}
          <div
            className={cn(
              "relative h-[68px] flex items-center gap-3 shrink-0 transition-[padding] duration-200",
              expanded ? "px-5" : "justify-center"
            )}
          >
            <img
              src={logo}
              alt="MIBUSCA"
              className="w-11 h-11 object-contain shrink-0 drop-shadow-[0_8px_18px_hsl(var(--primary)/0.45)]"
            />
            <div className={cn("min-w-0 overflow-hidden", fadeIn, visible)}>
              <h2 className="font-heading font-extrabold text-foreground text-[15px] leading-none tracking-[0.18em] whitespace-nowrap">
                MIBUSCA
              </h2>
              <p className="text-[9px] text-muted-foreground tracking-[0.3em] uppercase mt-1.5 whitespace-nowrap font-semibold">
                Painel
              </p>
            </div>
          </div>

          {/* Scroll area — padding sempre px-3; overflow-x-hidden corta o conteúdo */}
          <div className="relative flex-1 overflow-y-auto overflow-x-hidden scrollbar-none py-4 flex flex-col gap-4 px-3">

            {/* Navegação */}
            <div className="flex flex-col gap-1">
              <p className={cn(
                "px-3 mb-1 text-[9px] font-bold tracking-[0.25em] uppercase text-muted-foreground/60 whitespace-nowrap",
                fadeIn, visible
              )}>
                Navegação
              </p>

              {pages.map((p) => {
                const Icon = p.icon;
                const isActive = location.pathname === p.to;
                return (
                  <Tooltip key={p.label}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          navigate(p.to);
                          onPageChange?.(p.to);
                          if (p.to === "/") onTabChange?.("GERAL");
                          setMobileOpen(false);
                        }}
                        className={cn(
                          // Layout sempre expandido — o overflow-x-hidden do pai corta o texto quando colapsado
                          "group relative flex items-center w-full h-11 rounded-xl text-[13px] font-semibold gap-3 px-3 justify-start",
                          "transition-colors duration-200 overflow-hidden",
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
                        {/* Texto faz fade — nunca sai do DOM */}
                        <span className={cn("relative whitespace-nowrap", fadeIn, visible)}>
                          {p.label}
                        </span>
                      </button>
                    </TooltipTrigger>
                    {!expanded && <TooltipContent side="right">{p.label}</TooltipContent>}
                  </Tooltip>
                );
              })}
            </div>

            {/* Grupos — sempre no DOM, fade in/out com opacity */}
            {groups && groups.length > 0 && (
              <div className={cn("flex flex-col gap-0.5", fadeIn, visible)}>
                {groups.map((group) => {
                  const isOpen = expandedGroups[group.label] ?? false;
                  return (
                    <div key={group.label}>
                      {/* Cabeçalho do grupo */}
                      <button
                        onClick={() => toggleGroup(group.label)}
                        className={cn(
                          "w-full flex items-center gap-2 h-8 px-3 rounded-lg transition-all duration-200",
                          isOpen
                            ? "text-primary/80 bg-primary/5"
                            : "text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-white/[0.03]"
                        )}
                      >
                        {/* Dot pulsante */}
                        <span
                          className={cn(
                            "w-1 h-1 rounded-full bg-primary shrink-0 transition-all duration-300",
                            isOpen
                              ? "scale-[2] shadow-[0_0_6px_2px_hsl(var(--primary)/0.5)]"
                              : "opacity-25"
                          )}
                        />
                        <span className="flex-1 text-left text-[10px] font-bold tracking-[0.2em] uppercase whitespace-nowrap">
                          {group.label}
                        </span>
                        {isOpen ? (
                          <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
                        ) : (
                          <ChevronRight className="w-3 h-3 shrink-0 opacity-30" />
                        )}
                      </button>

                      {/* Tabs do grupo */}
                      {isOpen && (
                        <div className="mt-0.5 mb-1 flex flex-col gap-0.5 pl-2 animate-fade-in">
                          {group.tabs.map((t) => {
                            const isActive = activeTab === t.key;
                            return (
                              <button
                                key={t.key}
                                onClick={() => { onTabChange?.(t.key); setMobileOpen(false); }}
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
                  );
                })}
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className={cn(
              "relative mb-3 mx-3 flex items-center h-11 gap-3 px-3 justify-start rounded-xl",
              "text-[13px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10",
              "border border-transparent hover:border-destructive/20 transition-all duration-200"
            )}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={2.2} />
            <span className={cn("whitespace-nowrap", fadeIn, visible)}>Sair</span>
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
    </TooltipProvider>
  );
});

AppSidebar.displayName = "AppSidebar";

export default AppSidebar;
