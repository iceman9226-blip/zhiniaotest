import React from 'react';
import { ComparisonResult } from '../types';
import { Target, AlertTriangle, AlertCircle, Info, ChevronLeft } from 'lucide-react';

interface ComparisonDashboardProps {
  result: ComparisonResult;
}

const SeverityIcon = ({ severity }: { severity: 'High' | 'Medium' | 'Low' }) => {
  switch (severity) {
    case 'High': return <AlertTriangle className="w-5 h-5 text-red-500" />;
    case 'Medium': return <AlertCircle className="w-5 h-5 text-amber-500" />;
    case 'Low': return <Info className="w-5 h-5 text-blue-500" />;
    default: return null;
  }
};

const ComparisonDashboard: React.FC<ComparisonDashboardProps> = ({ result }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Score Overview */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-shrink-0 relative w-40 h-40">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={result.overallMatchScore >= 90 ? '#10b981' : result.overallMatchScore >= 75 ? '#FF8839' : '#ef4444'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - result.overallMatchScore / 100)}`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-slate-800">{result.overallMatchScore}%</span>
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider mt-1">还原度</span>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <h3 className="text-xl font-bold text-slate-800">总体评价</h3>
          <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
            {result.summary}
          </p>
          <div className="flex gap-4">
             <div className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium flex items-center gap-2">
               <AlertTriangle className="w-4 h-4" /> 严重: {result.discrepancies.filter(d => d.severity === 'High').length}
             </div>
             <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium flex items-center gap-2">
               <AlertCircle className="w-4 h-4" /> 中等: {result.discrepancies.filter(d => d.severity === 'Medium').length}
             </div>
          </div>
        </div>
      </div>

      {/* Discrepancies List */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Target className="w-6 h-6 text-[#FF8839]" /> 发现的差异项 ({result.discrepancies.length})
        </h2>
        
        <div className="grid gap-4">
          {result.discrepancies.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0 mt-1">
                <SeverityIcon severity={item.severity} />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg mb-2">
                      区域: {item.area}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">{item.issue}</h3>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-sm font-bold text-slate-700 block mb-1">修改建议：</span>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.suggestion}</p>
                </div>
              </div>
            </div>
          ))}

          {result.discrepancies.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed">
              <p className="text-slate-500 font-medium">完美！未发现明显视觉差异。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComparisonDashboard;
