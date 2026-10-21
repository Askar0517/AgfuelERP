import React from 'react';
import { DailySalesReport, Station } from '../types';
import { Printer, Download, CheckCircle, FileText, Building2 } from 'lucide-react';
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
      'Rate (Rs/L)',
      'Opening Dip (L)',
      'Decanted Inflow (L)',
      'Meter Sales (L)',
      'Test Measures (L)',
      'Expected Closing (L)',
      'Physical Dip (L)',
      'Dip Variance (L)',
      'Gross Revenue (Rs)',
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
    link.setAttribute('download', `DSR_${station.code}_${dsr.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 sm:pb-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-4 shadow-xs transition print:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">Statutory Form VIII Ready</span>
            <p className="text-[11px] text-slate-500 dark:text-gray-400">
              Verified daily sales report for official OMC & Legal Metrology inspection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Form VIII</span>
          </button>
        </div>
      </div>

      {/* Main Form VIII Register Paper Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 sm:p-8 shadow-xs text-slate-900 dark:text-gray-100 print:border-none print:shadow-none print:p-0 transition">
        {/* Formal Header */}
        <div className="border-b-2 border-slate-900 dark:border-gray-700 pb-4 text-center">
          <h2 className="text-lg font-bold tracking-tight uppercase">
            FORM VIII - DAILY SALES & STOCK REGISTER
          </h2>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            [See Rule 21(1) of the Petroleum Rules, 2002 & Legal Metrology Act]
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-700 dark:text-gray-300 border-t border-slate-200 dark:border-gray-800 pt-3">
            <div className="text-left">
              <strong>Dealer / Station:</strong> {station.name} ({station.code})
              <br />
              <strong>Location:</strong> {station.location}
            </div>
            <div className="text-right">
              <strong>Settlement Date:</strong> {dsr.date}
              <br />
              <strong>Status:</strong>{' '}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                {dsr.status}
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Product-wise Stock & Sales Table */}
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-2">
            Table A: Subterranean Tanks & Dispenser Sales Reconciliation
          </h3>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs border border-slate-200 dark:border-gray-800">
              <thead className="bg-slate-100 dark:bg-slate-900 text-[11px] font-bold uppercase text-slate-700 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-800">Product</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-right">Rate ({currency.symbol})</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-right">Opening Stock (L)</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-right">Receipts Decanted (L)</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-right">Gross Sales (L)</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-right">Testing Deduction (L)</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-right">Book Stock (L)</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-right">Actual Physical Dip (L)</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-bold">Variance (L)</th>
                  <th className="p-2 text-right font-bold">Gross Revenue ({currency.symbol})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-mono">
                {dsr.fuelSummaries.map((fuel: any) => (
                  <tr key={fuel.fuelCode} className="hover:bg-slate-50 dark:hover:bg-gray-900/50">
                    <td className="p-2 border-r border-slate-200 dark:border-gray-800 font-sans font-bold">
                      {fuel.fuelName}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-gray-800 text-right">
                      {fuel.rate.toFixed(2)}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-gray-800 text-right">
                      {fuel.openingDipLiters.toLocaleString()}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-gray-800 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                      +{fuel.receivedDecantedLiters.toLocaleString()}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-gray-800 text-right">
                      {(fuel.meterSalesLiters + fuel.testingLiters).toLocaleString()}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-gray-800 text-right text-rose-600 dark:text-rose-400">
                      -{fuel.testingLiters.toLocaleString()}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-gray-800 text-right">
                      {fuel.expectedClosingStockLiters.toLocaleString()}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-gray-800 text-right font-bold text-slate-900 dark:text-white">
                      {fuel.actualClosingDipLiters.toLocaleString()}
                    </td>
                    <td
                      className={`p-2 border-r border-slate-200 dark:border-gray-800 text-right font-bold ${
                        fuel.dipVarianceLiters < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {fuel.dipVarianceLiters > 0 ? `+${fuel.dipVarianceLiters}` : fuel.dipVarianceLiters}
                    </td>
                    <td className="p-2 text-right font-bold text-slate-900 dark:text-white">
                      {currency.symbol}{fuel.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-gray-900 font-bold text-xs border-t-2 border-slate-900 dark:border-gray-700">
                <tr>
                  <td colSpan={4} className="p-2 text-right uppercase">
                    Consolidated Forecourt Totals:
                  </td>
                  <td colSpan={2} className="p-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                    {dsr.totalVolumeSoldLiters.toLocaleString()} L Sold
                  </td>
                  <td colSpan={3} className="p-2 text-right">
                    Total Invoiced Sales:
                  </td>
                  <td className="p-2 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    {currency.symbol}{dsr.totalGrossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Section 2: Financial Handover & Settlement */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-gray-800 p-4 bg-slate-50 dark:bg-gray-900/40">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-3">
              Table B: Revenue Collection Channels
            </h4>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="font-sans text-slate-600 dark:text-gray-400">Physical Cash Handover:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {currency.symbol}{dsr.totalCashCollected.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-sans text-slate-600 dark:text-gray-400">POS / UPI Settlements:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {currency.symbol}{dsr.totalDigitalCollected.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-sans text-slate-600 dark:text-gray-400">Credit Slips & Indents:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {currency.symbol}{dsr.totalCreditCollected.toLocaleString()}
                </span>
              </div>
              <div className="border-t border-slate-200 dark:border-gray-800 pt-2 flex items-center justify-between font-bold text-sm">
                <span className="font-sans">Total Collected Deposits:</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {currency.symbol}{dsr.totalActualDeposits.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-gray-800 p-4 bg-slate-50 dark:bg-gray-900/40 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-2">
                Table C: Daily Cash Reconciliation Variance
              </h4>
              <div className="flex items-center justify-between py-2 text-xs font-mono">
                <span className="font-sans text-slate-600 dark:text-gray-400">Shortage / Excess:</span>
                <span
                  className={`font-bold ${
                    dsr.settlementDifference === 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : dsr.settlementDifference > 0
                      ? 'text-cyan-600 dark:text-cyan-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {dsr.settlementDifference === 0
                    ? `${currency.symbol}0.00 (Perfect Match)`
                    : `${currency.symbol}${dsr.settlementDifference.toLocaleString()}`}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-gray-400 italic">
                {dsr.auditorNotes ||
                  'No statutory discrepancy noted. All physical totalizers match electronic meter logs.'}
              </p>
            </div>

            <div className="mt-6 pt-3 border-t border-dashed border-slate-300 dark:border-gray-700 grid grid-cols-2 text-center text-xs">
              <div>
                <span className="block border-b border-slate-400 dark:border-gray-600 pb-8 text-transparent select-none">
                  Sig
                </span>
                <span className="mt-1 block font-semibold text-slate-700 dark:text-gray-300">Duty Manager Sign</span>
              </div>
              <div>
                <span className="block border-b border-slate-400 dark:border-gray-600 pb-8 text-transparent select-none">
                  Sig
                </span>
                <span className="mt-1 block font-semibold text-slate-700 dark:text-gray-300">Authorized Dealer Sign</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
