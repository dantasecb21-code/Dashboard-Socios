import type { SidebarGroup } from "@/components/AppSidebar";

export const BASE_SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: "GERAL",
    tabs: [
      {
        key: "ESTADOS",
        label: "Estados",
        badges: [
          { label: "iFOOD", tone: "ifood" },
          { label: "99FOOD", tone: "99food" },
        ],
      },
      { key: "COMERCIAL SP", label: "Comercial SP" },
      { key: "COMERCIAL", label: "Comercial" },
      { key: "OUTROS", label: "Outros" },
    ],
  },
  {
    label: "FINANCEIRO",
    tabs: [
      { key: "RH FOLHA", label: "RH Folha" },
    ],
  },
  {
    label: "IFOOD",
    tabs: [
      { key: "IFOOD", label: "iFood" },
      { key: "ESTRATÉGIAS", label: "Estratégias iFood" },
      {
        key: "PERFORMANCE",
        label: "Performance iFood",
        badges: [{ label: "iFOOD", tone: "ifood" }],
      },
    ],
  },
  {
    label: "99FOOD",
    tabs: [
      { key: "99FOOD", label: "99food" },
      {
        key: "PERFORMANCE 99",
        label: "Performance 99Food",
        badges: [{ label: "99FOOD", tone: "99food" }],
      },
    ],
  },
];
