import React from 'react';
import { DailySalesReport, Station } from '../types';
import {
  Printer,
  Download,
  CheckCircle,
  FileText,
  Building2,
  TrendingUp,
  Fuel,
  ShieldCheck,
  CreditCard,
  Banknote,
  Receipt,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { getBunkCurrency } from '../utils/currency';

interface DSRSheetProps {
  dsr: DailySalesReport;
  station: Station;
  onRefresh: () => void;
}

export const DSRSheet: React.FC<DSRSheetProps> = ({ dsr, station }) => {
  const currency = getBunkCurrency(station);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'Fuel Product',
      'Rate (' + currency.symbol + '/L)',
      'Opening Stock (L)',
      'Decanted Receipts (L)',
      'Net Sales (L)',
      'Testing Measures (L)',
      'Book Stock (L)',
      'Actual Closing Dip (L)',
      'Dip Variance (L)',
      'Gross Revenue (' + currency.symbol + ')',
    ];

    const rows = dsr.fuelSummaries.map((f: any) => [
      f.fuelName,
      f.rate.toFixed(2),
      f.openingDipLiters,
      f.receivedDecantedLiters,
      f.meterSalesLiters,
      f.testingLiters,
      f.expectedClosingStockLiters,
      f.actualClosingDipLiters,
      f.dipVarianceLiters,
      f.grossRevenue.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daily_Sales_Report_${station.code}_${dsr.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format date nicely: e.g. "Monday, 27 October 2026"
  const formattedDate = (() => {
    try {
      const d = new Date(dsr.date + 'T00:00:00');
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dsr.date;
    }
  })();

  const cashPct = dsr.totalGrossRevenue > 0
    ? Math.round((dsr.totalCashCollected / dsr.totalGrossRevenue) * 100)
    : 0;
  const digitalPct = dsr.totalGrossRevenue > 0
    ? Math.round((dsr.totalDigitalCollected / dsr.totalGrossRevenue) * 100)
    : 0;
  const creditPct = dsr.totalGrossRevenue > 0
    ? Math.max(0, 100 - cashPct - digitalPct)
    : 0;

  return (
    <div className="space-y-4 pb-12 sm:pb-6">
      {/* Top action bar (hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 shadow-xs transition print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Daily Sales Report (DSR)
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                {dsr.status || 'Verified'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Executive sales summary, tank stock audit, and revenue reconciliation for {formattedDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl bg-[#12544F] hover:bg-[#0E433F] active:scale-95 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition cursor-pointer"
            title="Download or Print A4 PDF format"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Download A4 PDF</span>
          </button>
        </div>
      </div>

      {/* Main Printable A4 Document Sheet */}
      <div className="dsr-a4-document rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 sm:p-8 shadow-xs text-slate-900 dark:text-slate-100 transition print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
        {/* Document Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
                <Building2 className="w-4 h-4" />
                <span>AG Fuels Forecourt Network</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                Daily Sales & Operations Report
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Authoritative register of fuel stock movements, totalizer meter sales, and cash reconciliations.
              </p>
            </div>

            <div className="sm:text-right text-xs space-y-1">
              <div className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white">
                {station.name}
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                <strong>Location:</strong> {station.location || 'Central Forecourt'}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                <strong>Settlement Date:</strong> {formattedDate}
              </p>
            </div>
          </div>
        </div>

        {/* Executive KPI Summary Cards */}
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
          {/* Card 1: Gross Sales Revenue */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/70 dark:bg-slate-900/50 print:bg-white print:border-slate-300">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Total Gross Revenue
            </span>
            <div className="mt-1 flex items-baseline gap-1 font-mono text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
              <span>{currency.symbol}</span>
              <span>{dsr.totalGrossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Invoiced forecourt throughput
            </span>
          </div>

          {/* Card 2: Total Volume Dispensed */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/70 dark:bg-slate-900/50 print:bg-white print:border-slate-300">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Net Volume Dispensed
            </span>
            <div className="mt-1 flex items-baseline gap-1 font-mono text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              <span>{dsr.totalVolumeSoldLiters.toLocaleString()}</span>
              <span className="text-xs font-normal text-slate-500">L</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Metered nozzle deliveries
            </span>
          </div>

          {/* Card 3: Bankable Deposits Collected */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/70 dark:bg-slate-900/50 print:bg-white print:border-slate-300">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Deposits Collected
            </span>
            <div className="mt-1 flex items-baseline gap-1 font-mono text-lg sm:text-xl font-black text-teal-600 dark:text-teal-400">
              <span>{currency.symbol}</span>
              <span>{dsr.totalActualDeposits.toLocaleString()}</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Cash: {cashPct}% · Digital: {digitalPct}% · Credit: {creditPct}%
            </span>
          </div>

          {/* Card 4: Reconciliation Settlement Difference */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/70 dark:bg-slate-900/50 print:bg-white print:border-slate-300">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Cash / Stock Variance
            </span>
            <div
              className={`mt-1 flex items-baseline gap-1 font-mono text-lg sm:text-xl font-black ${
                dsr.settlementDifference === 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : dsr.settlementDifference > 0
                  ? 'text-amber-500'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              <span>{currency.symbol}</span>
              <span>{dsr.settlementDifference.toLocaleString()}</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
              {dsr.settlementDifference === 0 ? '✓ Balanced Settlement' : 'Audit review pending'}
            </span>
          </div>
        </div>

        {/* Section 1: Product-Wise Fuel Stock & Meter Sales Reconciliation */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5 text-emerald-600" />
              <span>Section 1: Product-Wise Sales & Underground Tank Reconciliation</span>
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Unit: Liters (L) & Currency ({currency.symbol})
            </span>
          </div>

          <div className="overflow-x-auto no-scrollbar rounded-xl border border-slate-200 dark:border-slate-800 print:overflow-visible">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-900 text-[11px] font-bold uppercase text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-2.5">Product</th>
                  <th className="p-2.5 text-right">Rate</th>
                  <th className="p-2.5 text-right">Opening Dip</th>
                  <th className="p-2.5 text-right">Receipts</th>
                  <th className="p-2.5 text-right">Net Sales</th>
                  <th className="p-2.5 text-right">Quality Test</th>
                  <th className="p-2.5 text-right">Book Stock</th>
                  <th className="p-2.5 text-right">Closing Dip</th>
                  <th className="p-2.5 text-right font-bold">Variance</th>
                  <th className="p-2.5 text-right font-bold">Gross Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                {dsr.fuelSummaries.map((fuel: any) => (
                  <tr key={fuel.fuelCode} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/30">
                    <td className="p-2.5 font-sans font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          fuel.fuelCode.includes('98')
                            ? 'bg-rose-500'
                            : fuel.fuelCode.includes('95')
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                        }`}
                      />
                      <span>{fuel.fuelName}</span>
                    </td>
                    <td className="p-2.5 text-right text-slate-600 dark:text-slate-300">
                      {currency.symbol}{fuel.rate.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right text-slate-700 dark:text-slate-300">
                      {fuel.openingDipLiters.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                      +{fuel.receivedDecantedLiters.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                      {fuel.meterSalesLiters.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right text-slate-500">
                      {fuel.testingLiters > 0 ? `-${fuel.testingLiters}` : '0'}
                    </td>
                    <td className="p-2.5 text-right text-slate-600 dark:text-slate-400">
                      {fuel.expectedClosingStockLiters.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                      {fuel.actualClosingDipLiters.toLocaleString()}
                    </td>
                    <td
                      className={`p-2.5 text-right font-bold ${
                        fuel.dipVarianceLiters < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : fuel.dipVarianceLiters > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {fuel.dipVarianceLiters > 0 ? `+${fuel.dipVarianceLiters}` : fuel.dipVarianceLiters}
                    </td>
                    <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {currency.symbol}{fuel.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold text-xs border-t-2 border-slate-300 dark:border-slate-700">
                <tr>
                  <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider font-sans text-slate-600 dark:text-slate-400">
                    Total Forecourt Sales:
                  </td>
                  <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    {dsr.totalVolumeSoldLiters.toLocaleString()} L
                  </td>
                  <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider font-sans text-slate-600 dark:text-slate-400">
                    Total Invoiced Revenue:
                  </td>
                  <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    {currency.symbol}{dsr.totalGrossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Section 2: Financial Settlement & Revenue Channel Breakdown */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
          {/* Revenue Breakdown */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/30 print:bg-white print:border-slate-300">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              <span>Section 2: Payment Collection Channels</span>
            </h3>
            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 print:border-slate-200">
                <span className="font-sans flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>Physical Cash Handover ({cashPct}%)</span>
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {currency.symbol}{dsr.totalCashCollected.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 print:border-slate-200">
                <span className="font-sans flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>POS Terminal & UPI Online ({digitalPct}%)</span>
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {currency.symbol}{dsr.totalDigitalCollected.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 print:border-slate-200">
                <span className="font-sans flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  <span>Credit Indents & Fleet Slips ({creditPct}%)</span>
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {currency.symbol}{dsr.totalCreditCollected.toLocaleString()}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-bold text-sm">
                <span className="font-sans">Total Collected Deposits:</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {currency.symbol}{dsr.totalActualDeposits.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Verification & Dual Sign-Off */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col justify-between print:bg-white print:border-slate-300">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Section 3: Audit Certification & Compliance</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 print:border-slate-200">
                {dsr.auditorNotes ||
                  'Certified that all opening dips, decanted tanker receipts, electronic meter totalizers, and physical handovers have been verified in compliance with daily operational guidelines.'}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-dashed border-slate-300 dark:border-slate-700 grid grid-cols-2 gap-4 text-center text-xs">
              <div>
                <div className="h-10 border-b border-slate-400 dark:border-slate-600 flex items-end justify-center pb-1">
                  <span className="font-serif italic text-slate-500 text-xs">Verified & Sealed</span>
                </div>
                <span className="mt-1.5 block font-semibold text-slate-800 dark:text-slate-200">
                  Station Duty Manager
                </span>
              </div>
              <div>
                <div className="h-10 border-b border-slate-400 dark:border-slate-600 flex items-end justify-center pb-1">
                  <span className="font-serif italic text-slate-500 text-xs">Authorized Signature</span>
                </div>
                <span className="mt-1.5 block font-semibold text-slate-800 dark:text-slate-200">
                  Authorized Station Dealer
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="mt-6 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 gap-1">
          <span>AG Fuels Forecourt ERP · Daily Operating System</span>
          <span>Generated on {new Date().toLocaleString()} · Official Record</span>
        </div>
      </div>
    </div>
  );
};
