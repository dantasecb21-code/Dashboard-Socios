import { LucideIcon, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type KpiCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "destructive" | "info";
  delay?: number;
  tooltip?: string;
};

const iconVariantStyles = {
  default: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/15 text-destructive",
  info: "bg-info/15 text-info",
};

const KpiCard = ({ title, value, subtitle, icon: Icon, variant = "default", delay = 0, tooltip }: KpiCardProps) => {
  const valueText = String(value);
  const isLongValue = valueText.length >= 11;

  return (
    <div
      className="group glass-card p-2.5 sm:p-4 lg:p-5 opacity-0 animate-fade-in overflow-hidden relative transition-all duration-500 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_24px_60px_-20px_hsl(244_75%_30%/0.7)]"
      style={{ animationDelay: `${delay * 0.1}s` }}
    >
      {/* hover sheen */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-[radial-gradient(120%_80%_at_0%_0%,hsl(var(--primary)/0.18),transparent_55%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {/* corner glow */}
      <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/15 blur-3xl opacity-60" />

      <div className="relative flex items-start justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <p className="text-[8px] sm:text-[10px] lg:text-[11px] text-muted-foreground font-semibold uppercase tracking-[0.18em] leading-tight line-clamp-2 min-w-0">{title}</p>
          {tooltip && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center" className="z-[120] w-[min(calc(100vw-1.5rem),18rem)] max-w-[18rem] text-[11px] sm:w-[min(calc(100vw-2rem),20rem)] sm:max-w-[20rem]">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className={`relative p-1.5 sm:p-2 lg:p-2.5 rounded-lg sm:rounded-xl shrink-0 border border-white/10 backdrop-blur-md ${iconVariantStyles[variant]} shadow-[inset_0_1px_0_hsl(0_0%_100%/0.12)]`}>
          <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4" strokeWidth={2} />
        </div>
      </div>
      <div className="relative mt-2 min-w-0">
        <p className={`font-heading font-extrabold text-foreground leading-[1.05] tracking-tight whitespace-nowrap tabular-nums stat-glow max-w-full ${isLongValue ? "text-[12px] sm:text-sm lg:text-base xl:text-lg" : "text-sm sm:text-base lg:text-xl xl:text-2xl"}`}>{valueText}</p>
        {subtitle && (
          <p className="text-[8px] sm:text-[10px] lg:text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <span className="w-1 h-1 rounded-full bg-primary/70 shrink-0 shadow-[0_0_6px_hsl(var(--primary))]" />
            <span className="truncate">{subtitle}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default KpiCard;
