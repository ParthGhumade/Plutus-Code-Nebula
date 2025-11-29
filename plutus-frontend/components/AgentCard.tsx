import React, { useState } from 'react';
import { XaiBar } from './XaiBar';

interface FeatureScore {
    name: string;
    score: number;
}

interface AgentResponse {
    action: string;
    ticker: string;
    pct: number;
    confidence: number;
    top_features: FeatureScore[];
    explanation: string;
    audit_hash: string;
}

interface AgentCardProps {
    data: AgentResponse;
    onApprove: () => void;
    onOverride: (reason: string) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ data, onApprove, onOverride }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showOverride, setShowOverride] = useState(false);
    const [overrideReason, setOverrideReason] = useState('');

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 max-w-md w-full mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg text-gray-800">{data.ticker}</span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">Risk Score: 65</span>
                </div>
                <div className="text-sm text-gray-400">Agent Confidence: {(data.confidence * 100).toFixed(0)}%</div>
            </div>

            {/* Main Action */}
            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-1">
                    {data.action} <span className="text-teal-600">{data.pct}%</span>
                </h2>
                <p className="text-gray-500 text-sm">of position value</p>
            </div>

            {/* Rationale */}
            <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100">
                <p className="text-blue-800 text-sm font-medium">"{data.explanation}"</p>
            </div>

            {/* XAI Section */}
            <div className="mb-6">
                <div
                    className="flex justify-between items-center cursor-pointer mb-2"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Why this decision?</span>
                    <span className="text-xs text-teal-600">{isExpanded ? 'Hide' : 'Show Details'}</span>
                </div>

                {isExpanded && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        {data.top_features.map((feature, idx) => (
                            <XaiBar key={idx} label={feature.name} score={feature.score} />
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            {!showOverride ? (
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setShowOverride(true)}
                        className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                        Override
                    </button>
                    <button
                        onClick={onApprove}
                        className="px-4 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 shadow-sm transition-colors"
                    >
                        Approve
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <textarea
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Why are you overriding? (Required for audit)"
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        rows={2}
                    />
                    <div className="flex space-x-3">
                        <button
                            onClick={() => setShowOverride(false)}
                            className="flex-1 py-2 text-gray-500 text-sm hover:text-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onOverride(overrideReason)}
                            disabled={!overrideReason.trim()}
                            className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                        >
                            Confirm Override
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
