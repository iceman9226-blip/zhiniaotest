import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  MousePointerClick, 
  Eye, 
  Lightbulb, 
  Sparkles, 
  BarChart3, 
  Edit2, 
  ZoomIn, 
  Clock, 
  HelpCircle 
} from 'lucide-react';

const ICONS = [
  Layout, MousePointerClick, Eye, Lightbulb, Sparkles, 
  BarChart3, Edit2, ZoomIn, Clock, HelpCircle
];

const COLORS = [
  'text-blue-500', 'text-amber-500', 'text-emerald-500', 
  'text-purple-500', 'text-[#FF8839]', 'text-indigo-500', 
  'text-rose-500', 'text-cyan-500', 'text-pink-500'
];

interface Particle {
  id: number;
  Icon: React.ElementType;
  color: string;
  tx: string;
  ty: string;
  px: string;
  py: string;
  rot: string;
  delay: string;
  duration: string;
}

const generateParticles = (count: number, startId: number): Particle[] => {
  return Array.from({ length: count }).map((_, i) => {
    const angle = Math.random() * Math.PI * 2;
    // Distance from center: start outside the circle (radius > 100px)
    const distance = 120 + Math.random() * 60; 
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    
    // Perpendicular offset for curved path
    const curveDir = Math.random() > 0.5 ? 1 : -1;
    const curveMag = 20 + Math.random() * 40; // 20 to 60 px curve
    const px = -Math.sin(angle) * curveMag * curveDir;
    const py = Math.cos(angle) * curveMag * curveDir;
    
    // Rotation
    const rot = (Math.random() - 0.5) * 240; // -120deg to 120deg
    
    return {
      id: startId + i,
      Icon: ICONS[Math.floor(Math.random() * ICONS.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      tx: `${tx}px`,
      ty: `${ty}px`,
      px: `${px}px`,
      py: `${py}px`,
      rot: `${rot}deg`,
      delay: `${Math.random() * 0.3}s`,
      duration: `${1.2 + Math.random() * 0.6}s` // 1.2s to 1.8s
    };
  });
};

const FlyingIcons: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [particleIdCounter, setParticleIdCounter] = useState(0);

  useEffect(() => {
    // Initial batch
    setParticles(generateParticles(6, 0));
    setParticleIdCounter(6);

    // Periodically add new particles and remove old ones
    const interval = setInterval(() => {
      setParticleIdCounter(prevId => {
        setParticles(prev => {
          const newParticles = generateParticles(4, prevId);
          return [...prev.slice(-12), ...newParticles];
        });
        return prevId + 4;
      });
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {particles.map((item) => (
        <div
          key={item.id}
          className="absolute top-1/2 left-1/2 -mt-3 -ml-3 animate-float-in opacity-0"
          style={{
            '--tx': item.tx,
            '--ty': item.ty,
            '--px': item.px,
            '--py': item.py,
            '--rot': item.rot,
            animationDelay: item.delay,
            animationDuration: item.duration,
          } as React.CSSProperties}
        >
          <item.Icon className={`w-6 h-6 ${item.color}`} />
        </div>
      ))}
    </div>
  );
};

export default FlyingIcons;
