import { useState, useMemo } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Estrategia, EstrategiasSummary } from "@/services/estrategiasService";
import EstrategiasKpis from "./EstrategiasKpis";
import EstrategiasStatusChart from "./EstrategiasStatusChart";
import GestorRanking from "./GestorRanking";
import ProducaoDiaria from "./ProducaoDiaria";
import EstrategiasTable from "./EstrategiasTable";
import GestorPerformance from "./GestorPerformance";
import EstrategiasExcelExportModal from "./EstrategiasExcelExportModal";

interface Props {
  estrategias: Estrategia[];
  summary?: EstrategiasSummary;
  isLoading?: boolean;
}

const EstrategiasContent = ({ estrategias, summary, isLoading }: Props) => {
  const [subTab, setSubTab] = useState("GERAL");
  const [excelOpen, setExcelOpen] = useState(false);

  const plataformas = useMemo(() => {
    const set = new Set<string>();
    estrategias.forEach(e => {
      if (e.plataforma?.trim()) set.add(e.plataforma.trim());
    });
    return Array.from(set).sort();
  }, [estrategias]);

  const subTabs = ["GERAL", ...plataformas];

  const filtered = useMemo(() => {
    if (subTab === "GERAL") return estrategias;
    return estrategias.filter(e => e.plataforma?.trim() === subTab);
  }, [estrategias, subTab]);

  // Only pass full summary for GERAL tab; sub-tabs compute from filtered rows
  const activeSummary = subTab === "GERAL" ? summary : undefined;

  return (
    <div className={`space-y-4 sm:space-y-6 ${isLoading ? "opacity-60" : ""}`}>
      {/* Sub-tabs por plataforma */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {subTabs.map(tab => {
          const count = tab === "GERAL"
            ? (summary?.total ?? estrategias.length)
            : (summary?.porPlataforma?.[tab] ?? estrategias.filter(e => e.plataforma?.trim() === tab).length);
          return (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={`px-3 py-1.5 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase rounded-lg transition-all whitespace-nowrap ${
                subTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab}
              <span className={`ml-1.5 text-[9px] px-1 py-0.5 rounded ${
                subTab === tab ? "bg-primary-foreground/20" : "bg-muted"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setExcelOpen(true)}
          className="ml-auto shrink-0 px-3 py-1.5 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase rounded-lg bg-success text-success-foreground hover:bg-success/90 transition-all flex items-center gap-1.5 whitespace-nowrap"
          title="Exportar estratégias para Excel com filtros (atrasadas, em andamento, etc.)"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Excel
        </button>
      </div>

      <EstrategiasExcelExportModal open={excelOpen} onClose={() => setExcelOpen(false)} estrategias={estrategias} />

      <EstrategiasKpis estrategias={filtered} summary={activeSummary} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <EstrategiasStatusChart estrategias={filtered} />
        <div className="lg:col-span-2">
          <GestorRanking estrategias={filtered} />
        </div>
      </div>

      <ProducaoDiaria estrategias={filtered} />

      <GestorPerformance estrategias={filtered} />

      <EstrategiasTable estrategias={filtered} />
    </div>
  );
};

export default EstrategiasContent;
