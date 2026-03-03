import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Dimension } from '../types';

interface Props {
  data: {
    [key in Dimension]: number;
  };
}

const dimensionDescriptions: Record<string, string> = {
  [Dimension.OPERABILITY]: '评估用户完成核心任务的效率、交互路径的合理性以及防错机制。',
  [Dimension.LEARNABILITY]: '评估界面是否符合用户心智模型，新用户能否快速理解并上手。',
  [Dimension.CLARITY]: '评估视觉层级、信息排版、文案表达是否清晰易懂，无歧义。',
};

const getScoreColor = (score: number) => {
  if (score >= 8) return '#22c55e'; // green-500
  if (score >= 6) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const dimensionName = data.subject;
    const score = data.A;
    const color = getScoreColor(score);

    return (
      <div className="bg-white p-3 shadow-lg rounded-xl border border-slate-100 max-w-[200px] z-50">
        <p className="font-bold text-slate-800 mb-1">{dimensionName}</p>
        <p className="font-bold text-lg mb-2" style={{ color }}>{score} 分</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          {dimensionDescriptions[dimensionName]}
        </p>
      </div>
    );
  }
  return null;
};

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const score = payload.A;
  const color = getScoreColor(score);
  
  return (
    <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={2} />
  );
};

const DimensionRadar: React.FC<Props> = ({ data }) => {
  const chartData = [
    { subject: Dimension.OPERABILITY, A: data[Dimension.OPERABILITY], fullMark: 10 },
    { subject: Dimension.LEARNABILITY, A: data[Dimension.LEARNABILITY], fullMark: 10 },
    { subject: Dimension.CLARITY, A: data[Dimension.CLARITY], fullMark: 10 },
  ];

  // Custom tick component to render dimension name and score
  const CustomTick = ({ payload, x, y, textAnchor, stroke, radius }: any) => {
    const dataPoint = chartData.find(d => d.subject === payload.value);
    const score = dataPoint ? dataPoint.A : 0;
    const color = getScoreColor(score);
    
    return (
      <g className="recharts-layer recharts-polar-angle-axis-tick">
        <text
          radius={radius}
          stroke={stroke}
          x={x}
          y={y}
          className="recharts-text recharts-polar-angle-axis-tick-value cursor-help"
          textAnchor={textAnchor}
        >
          <title>{`${payload.value}: ${score}分\n${dimensionDescriptions[payload.value]}`}</title>
          <tspan x={x} dy="0em" fill="#334155" fontSize="13" fontWeight="500">{payload.value}</tspan>
          <tspan x={x} dy="1.4em" fill={color} fontSize="15" fontWeight="700">{score}</tspan>
        </text>
      </g>
    );
  };

  return (
    <div className="w-full h-64 outline-none">
      <ResponsiveContainer width="100%" height="100%" className="outline-none">
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
          <defs>
            <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF8839" stopOpacity={0.8}/>
              <stop offset="100%" stopColor="#FFB67B" stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          <PolarGrid gridType="circle" stroke="#cbd5e1" strokeDasharray="3 3" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={(props) => <CustomTick {...props} />}
          />
          <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            name="得分"
            dataKey="A"
            stroke="#FF8839" 
            strokeWidth={2}
            fill="url(#radarGradient)"
            isAnimationActive={true}
            dot={<CustomDot />}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DimensionRadar;