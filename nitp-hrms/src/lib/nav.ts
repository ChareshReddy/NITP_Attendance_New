import type { Tone } from "./tones";

export type NavItem = { href: string; label: string; section: string; tone: Tone; roles: ("HR" | "TL" | "EMPLOYEE")[] };

const ALL: NavItem["roles"] = ["HR", "TL", "EMPLOYEE"];

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", section: "Overview", tone: "sky", roles: ALL },
  { href: "/attendance", label: "Attendance", section: "Time", tone: "mint", roles: ALL },
  { href: "/team", label: "Team Live", section: "Time", tone: "peach", roles: ["HR", "TL"] },
  { href: "/tracksheet", label: "Track Sheet", section: "Work", tone: "lav", roles: ALL },
  { href: "/tasks", label: "Tasks", section: "Work", tone: "lemon", roles: ALL },
  { href: "/leave", label: "Leave & WFH", section: "Time off", tone: "rose", roles: ALL },
  { href: "/payroll", label: "Payroll", section: "Money", tone: "mint", roles: ALL },
  { href: "/performance", label: "Performance", section: "Growth", tone: "sky", roles: ALL },
  { href: "/trainings", label: "Trainings", section: "Growth", tone: "lav", roles: ALL },
  { href: "/exit", label: "Exit", section: "Lifecycle", tone: "peach", roles: ALL },
  { href: "/employees", label: "Employees", section: "People", tone: "lemon", roles: ["HR"] },
  { href: "/audit", label: "Audit Log", section: "Compliance", tone: "rose", roles: ["HR"] },
  { href: "/settings", label: "Settings", section: "Admin", tone: "gray", roles: ["HR"] },
];

export const ROLE_NAME = { HR: "HR Admin", TL: "Team Leader", EMPLOYEE: "Employee" } as const;
