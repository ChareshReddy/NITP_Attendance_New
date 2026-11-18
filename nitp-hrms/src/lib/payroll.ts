// Monthly salary split from annual CTC. Indian payroll conventions, simplified:
// Basic 40% of gross, HRA 50% of Basic, fixed conveyance/medical, rest Special.
// PF 12% of Basic capped at ₹1,800; Professional Tax ₹200; TDS estimated on new-regime slabs.

export type SalaryLine = { label: string; amount: number };
export type Payslip = {
  earnings: SalaryLine[];
  deductions: SalaryLine[];
  gross: number;
  totalDeductions: number;
  net: number;
  lopDays: number;
  paidDays: number;
};

export function monthlyGross(ctcAnnual: number): number {
  // Employer PF (up to ₹1,800/month) is part of CTC, not gross.
  const monthly = ctcAnnual / 12;
  return Math.max(0, Math.round(monthly - Math.min(1800, monthly * 0.4 * 0.12)));
}

/** Annual income tax under the new regime (FY 2025-26 slabs, ₹75k standard deduction, 87A rebate up to ₹12L), with 4% cess. */
export function annualTax(annualGross: number): number {
  const taxable = Math.max(0, annualGross - 75000);
  if (taxable <= 1200000) return 0;
  const slabs: [number, number][] = [
    [400000, 0],
    [800000, 0.05],
    [1200000, 0.1],
    [1600000, 0.15],
    [2000000, 0.2],
    [2400000, 0.25],
    [Infinity, 0.3],
  ];
  let tax = 0;
  let prev = 0;
  for (const [cap, rate] of slabs) {
    if (taxable > prev) tax += (Math.min(taxable, cap) - prev) * rate;
    prev = cap;
  }
  return Math.round(tax * 1.04);
}

export function buildPayslip(ctcAnnual: number, daysInMonth: number, lopDays: number): Payslip {
  const gross = monthlyGross(ctcAnnual);
  const basic = Math.round(gross * 0.4);
  const hra = Math.round(basic * 0.5);
  const conveyance = Math.min(1600, Math.max(0, gross - basic - hra));
  const medical = Math.min(1250, Math.max(0, gross - basic - hra - conveyance));
  const special = Math.max(0, gross - basic - hra - conveyance - medical);
  const lop = Math.min(lopDays, daysInMonth);
  const lopAmount = Math.round((gross / daysInMonth) * lop);
  const pf = Math.min(1800, Math.round(basic * 0.12));
  const pt = gross > 15000 ? 200 : 0;
  const tds = Math.round(annualTax(gross * 12) / 12);
  const earnings = [
    { label: "Basic", amount: basic },
    { label: "HRA", amount: hra },
    { label: "Special allowance", amount: special },
    { label: "Conveyance", amount: conveyance },
    { label: "Medical", amount: medical },
  ];
  const deductions = [
    { label: "PF (12% of Basic, capped)", amount: pf },
    { label: "Professional tax", amount: pt },
    { label: "TDS (estimate)", amount: tds },
    { label: `Loss of pay · ${lop}d`, amount: lopAmount },
  ];
  const totalDeductions = deductions.reduce((a, b) => a + b.amount, 0);
  return { earnings, deductions, gross, totalDeductions, net: gross - totalDeductions, lopDays: lop, paidDays: daysInMonth - lop };
}
