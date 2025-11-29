import React from 'react';

interface XaiBarProps {
  label: string;
  score: number; // 0 to 1
}

export const XaiBar: React.FC<XaiBarProps> = ({ label, score }) => {
  return (
    <div className="flex flex-col mb-2">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{(score * 100).toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-teal-500 rounded-full" 
          style={{ width: `${score * 100}%` }}
        />
      </div>
    </div>
  );
};
