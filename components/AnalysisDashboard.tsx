import React from 'react';
import { AnalysisResult, PriorityLevel, Dimension } from '../types';
import DimensionRadar from './DimensionRadar';
import IssuesTable from './IssuesTable';
import { CheckCircle, AlertTriangle, Info, TrendingUp, ExternalLink, FilePieChart, ListChecks } from 'lucide-react';

interface DashboardProps {
  result: AnalysisResult;
}

const AnalysisDashboard: React.FC<DashboardProps> = ({ result }) => {
  
  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-emerald-600';
    if (score >= 7) return 'text-yellow-500';
    if (score >= 5) return 'text-orange-500';
    return 'text-red-500';
  };

  const getMetricBorderColor = (score: number) => {
    if (score >= 8.5) return 'border-l-emerald-500';
    if (score >= 7) return 'border-l-yellow-500';
    if (score >= 5) return 'border-l-orange-500';
    return 'border-l-red-500';
  };

  // Group metrics by dimension for display
  const groupedMetrics = {
    [Dimension.OPERABILITY]: result.metrics.filter(m => m.dimension === Dimension.OPERABILITY),
    [Dimension.LEARNABILITY]: result.metrics.filter(m => m.dimension === Dimension.LEARNABILITY),
    [Dimension.CLARITY]: result.metrics.filter(m => m.dimension === Dimension.CLARITY),
  };

  const currentDate = new Date().toLocaleString('zh-CN', {
     month: '2-digit',
     day: '2-digit',
     hour: '2-digit',
     minute: '2-digit',
     second: '2-digit'
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Executive Summary Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
        {/* Header with Link */}
        {result.sourceUrl && (
          <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500">
               <FilePieChart className="w-4 h-4" />
               <span className="text-sm font-medium">设计源文件</span>
            </div>
            <a 
              href={result.sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-[#FF8839] hover:text-[#FF6B1A] hover:underline"
            >
              <span>打开 Figma 查看</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* 2-Column Layout: Left (Visual Report) | Right (Text Summary) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-8 lg:gap-10">
          
          {/* Left Column: Reference Style Score & Radar */}
          <div className="lg:col-span-5 flex flex-col lg:border-r border-slate-100 lg:pr-6">
            
            {/* Header: Title & Time */}
            <div className="flex justify-between items-baseline mb-2">
               <h2 className="text-xl font-bold text-slate-800">易用性评分</h2>
               <span className="text-xs text-slate-400 font-mono">{currentDate} 更新</span>
            </div>

            {/* Big Score Number */}
            <div className="mb-6">
               <span className={`text-6xl font-bold tracking-tighter ${getScoreColor(result.overallScore)}`}>
                  {result.overallScore}
               </span>
            </div>

            {/* Color Bar Rating System */}
            <div className="relative mb-4 pt-2">
               {/* Indicator Arrow */}
               {/* We calculate left position based on score 0-10 -> 0-100% */}
               <div 
                  className="absolute -top-1 transform -translate-x-1/2 transition-all duration-1000 ease-out flex flex-col items-center"
                  style={{ left: `${Math.min(Math.max(result.overallScore * 10, 2), 98)}%` }}
               >
                  <div className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] drop-shadow-sm ${
                      result.overallScore >= 8.5 ? 'border-t-emerald-500' :
                      result.overallScore >= 7 ? 'border-t-yellow-500' :
                      result.overallScore >= 5 ? 'border-t-orange-500' : 'border-t-red-500'
                  }`}></div>
               </div>

               {/* Bars */}
               <div className="flex gap-1.5 h-3 w-full">
                  <div className="flex-1 bg-red-400 rounded-l-full opacity-80"></div>
                  <div className="flex-1 bg-orange-400 opacity-80"></div>
                  <div className="flex-1 bg-yellow-400 opacity-80"></div>
                  <div className="flex-1 bg-emerald-500 rounded-r-full opacity-80"></div>
               </div>

               {/* Labels */}
               <div className="flex justify-between text-xs text-slate-400 mt-2 px-1 font-medium">
                  <span>极差</span>
                  <span>较差</span>
                  <span>一般</span>
                  <span>良好</span>
                  <span>优秀</span>
               </div>
            </div>

            {/* Circular Radar (No Title) */}
            <div className="flex-grow flex items-center justify-center -ml-4 mt-2">
               <DimensionRadar data={result.dimensions} />
            </div>
          </div>

          {/* Right Column: Text Summary & Recommendations */}
          <div className="lg:col-span-7 flex flex-col space-y-6 pt-2">
            {/* Summary Text */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-slate-400" />
                评估摘要
              </h3>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <p className="text-slate-700 leading-relaxed text-base">
                  {result.summary}
                </p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-400" />
                关键优化建议
              </h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2.5 py-1.5 transition-colors">
                    <div className="mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold font-mono">
                      {i + 1}
                    </div>
                    <span className="text-slate-700 text-sm leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* Detailed Metrics Breakdown */}
      <div>
        <div className="flex items-center gap-2 mb-4 px-2">
          <ListChecks className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-bold text-slate-900">评分详情</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Loop through each dimension group */}
          {[Dimension.OPERABILITY, Dimension.LEARNABILITY, Dimension.CLARITY].map((dimName) => {
            const dim = dimName as Dimension;
            const metrics = groupedMetrics[dim];
            const dimScore = result.dimensions[dim];
            
            // Determine color based on score levels
            const barColor = dimScore >= 8.5 ? 'bg-emerald-500' :
                             dimScore >= 7 ? 'bg-yellow-500' :
                             dimScore >= 5 ? 'bg-orange-500' : 'bg-red-500';

            return (
              <div key={dim} className="flex flex-col gap-4">
                {/* Column Header */}
                <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2">
                     <div className={`w-2 h-8 rounded-full ${barColor}`} />
                     <div>
                       <h4 className="font-bold text-slate-800 text-sm">{dim}</h4>
                       <p className="text-[10px] text-slate-400">{metrics.length} 个指标</p>
                     </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-800">{dimScore}</div>
                    <div className="text-[10px] text-slate-400">平均分</div>
                  </div>
                </div>

                {/* Metrics Cards */}
                <div className="space-y-3">
                  {metrics.map((metric) => (
                    <div 
                      key={metric.id} 
                      className={`bg-white p-4 rounded-xl border border-slate-100 border-l-4 ${getMetricBorderColor(metric.score)} shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out`}
                    >
                       <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">易用性-{metric.id}</span>
                          <span className={`text-lg font-bold ${getScoreColor(metric.score)}`}>{metric.score}</span>
                       </div>
                       <p className="text-sm font-semibold text-slate-800 mb-2 leading-snug">{metric.question}</p>
                       <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg leading-relaxed">
                          {metric.comment || "无详细评价"}
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900">易用性问题</h3>
            <p className="text-slate-500 text-sm">优先级排序 = 严重程度 × 发生频率 × 修复成本</p>
          </div>
          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
            {result.issues.filter(i => i.priorityLevel === PriorityLevel.URGENT || i.priorityLevel === PriorityLevel.HIGH).length} 个严重问题
          </span>
        </div>
        <IssuesTable issues={result.issues} />
      </div>

      {/* Nielsen Chatbot Guidance */}
      <div className="bg-gradient-to-r from-[#FF8839]/10 to-purple-500/10 rounded-2xl p-6 border border-[#FF8839]/20 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm relative overflow-hidden">
        {/* Decorative background blur */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#FF8839]/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md shrink-0">
            <img 
              src="https://nimg.ws.126.net/?url=http%3A%2F%2Fspider.ws.126.net%2Fa51f9638ba088baf086f6559b2f080ff.jpeg&thumbnail=660x2147483647&quality=80&type=jpg" 
              alt="Jakob Nielsen"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">需要更深入的设计指导？</h3>
            <p className="text-slate-600 text-sm">
              点击右下角的头像，与 <strong>Jakob Nielsen</strong> 专家助手对话，获取基于 10 大可用性原则的定制化优化方案。
            </p>
          </div>
        </div>
        
        <div className="relative z-10 shrink-0">
          <button 
            onClick={() => {
              // Find the chatbot button and click it
              const chatBtn = document.querySelector('button[title="Ask Nielsen"]') as HTMLButtonElement;
              if (chatBtn) chatBtn.click();
            }}
            className="flex items-center gap-2 px-6 py-3 bg-white text-[#FF8839] font-bold rounded-full shadow-sm hover:shadow-md border border-[#FF8839]/20 hover:border-[#FF8839] transition-all hover:-translate-y-0.5"
          >
            立即咨询专家
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  );
};

export default AnalysisDashboard;