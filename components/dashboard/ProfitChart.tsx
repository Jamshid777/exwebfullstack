import React from 'react';
// FIX: Import `Cell` from recharts to resolve a JSX error.
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { Transaction, Expense, ProfitData } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { useTheme } from '../../context/ThemeContext';


interface ProfitChartProps {
  transactions: Transaction[];
  expenses: Expense[];
}

// FIX: Corrected the return type annotation to `ProfitData[]`. The previous type was being misinterpreted by TypeScript, causing a type assignment error.
const processProfitData = (transactions: Transaction[], expenses: Expense[], language: string): ProfitData[] => {
  const monthlyData: Record<string, { grossProfit: number; expenses: number; }> = {};

  // Process profits from transactions
  [...transactions].reverse().forEach(tx => {
    if (typeof tx.profit === 'number') {
      const date = new Date(tx.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { grossProfit: 0, expenses: 0 };
      }
      monthlyData[key].grossProfit += tx.profit;
    }
  });
  
  // Process expenses
  [...expenses].reverse().forEach(ex => {
    const date = new Date(ex.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
    if (!monthlyData[key]) {
        monthlyData[key] = { grossProfit: 0, expenses: 0 };
    }
    monthlyData[key].expenses += ex.amountUsd;
  });

  // Convert to chart format
  return Object.keys(monthlyData).sort().map(key => {
    const [year, month] = key.split('-').map(Number);
    const dateLabel = new Date(year, month).toLocaleString(language, { month: 'short', year: 'numeric' });
    const { grossProfit, expenses } = monthlyData[key];
    return {
      date: dateLabel,
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      expenses: parseFloat(expenses.toFixed(2)),
      netProfit: parseFloat((grossProfit - expenses).toFixed(2)),
    };
  });
};

const CustomTooltip = ({ active, payload, label }: any) => {
    const { t } = useI18n();
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-surface dark:bg-slate-700 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600">
                <p className="font-semibold text-text-primary dark:text-slate-100">{label}</p>
                <p className="text-success dark:text-green-400">{t('dashboard.grossProfit')}: ${data.grossProfit.toFixed(2)}</p>
                <p className="text-danger dark:text-red-400">{t('dashboard.expenses')}: ${data.expenses.toFixed(2)}</p>
                <p className="font-bold text-primary-dark dark:text-slate-200">{t('dashboard.netProfit')}: ${data.netProfit.toFixed(2)}</p>
            </div>
        );
    }
    return null;
};


const ProfitChart: React.FC<ProfitChartProps> = ({ transactions, expenses }) => {
  const { t, language } = useI18n();
  const { theme } = useTheme();
  const profitData = processProfitData(transactions, expenses, language);

  const profitColor = theme === 'dark' ? '#5c6bc0' : '#1a237e'; // Lighter primary for dark
  const lossColor = theme === 'dark' ? '#f87171' : '#dc2626'; // Lighter red for dark
  const gridColor = theme === 'dark' ? '#374151' : '#e2e8f0'; // slate-700 vs slate-200
  const tickColor = theme === 'dark' ? '#94a3b8' : '#64748b'; // slate-400 vs slate-500

  if (profitData.length === 0) {
    return (
      <div className="bg-surface dark:bg-slate-800 p-6 rounded-lg shadow-md h-[400px] flex flex-col items-center justify-center text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
        <h3 className="text-lg font-semibold text-text-primary dark:text-slate-100">{t('dashboard.noProfitDataTitle')}</h3>
        <p className="text-text-secondary dark:text-slate-400 mt-1">{t('dashboard.noProfitDataDescription')}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface dark:bg-slate-800 p-6 rounded-lg shadow-md h-[400px]">
      <h3 className="text-lg font-semibold text-text-primary dark:text-slate-100 mb-4">{t('dashboard.profitChartTitle')}</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart
          data={profitData}
          margin={{ top: 5, right: 20, left: -10, bottom: 5, }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fill: tickColor }} />
          <YAxis tickFormatter={(value) => `$${value}`} tick={{ fill: tickColor }}/>
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={() => t('dashboard.netProfit')} />
          <Bar dataKey="netProfit" name={t('dashboard.netProfit')} barSize={30}>
            {profitData.map((entry, index) => (
              // FIX: Replaced `<cell>` with the correct `<Cell>` component from recharts to resolve the JSX error.
              <Cell key={`cell-${index}`} fill={entry.netProfit >= 0 ? profitColor : lossColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProfitChart;