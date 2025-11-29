'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AgentCard } from '@/components/AgentCard';

// Mock data for scenarios
const SCENARIOS = [
    {
        id: 'volatility_spike',
        title: 'Market Volatility Spike',
        description: 'VIX jumps 15% in a single session. Banking sector takes a hit.',
        agentResponse: {
            action: 'SELL',
            ticker: 'BANKETF',
            pct: 12.0,
            confidence: 0.78,
            explanation: 'Sell 12% to reduce banking concentration after volatility spiked.',
            audit_hash: 'demo_hash_123',
            top_features: [
                { name: 'Sector Exposure', score: 0.42 },
                { name: 'Implied Volatility', score: 0.28 },
                { name: 'Correlation', score: 0.12 },
            ]
        }
    },
    {
        id: 'tech_rally',
        title: 'Tech Sector Rally',
        description: 'Major tech earnings beat expectations. Nasdaq up 2.5%.',
        agentResponse: {
            action: 'BUY',
            ticker: 'NIFTYBEES',
            pct: 15.0,
            confidence: 0.85,
            explanation: 'Buy 15% to capture momentum in broad market index.',
            audit_hash: 'demo_hash_456',
            top_features: [
                { name: 'Momentum', score: 0.65 },
                { name: 'Volume Trend', score: 0.20 },
                { name: 'Sector Strength', score: 0.15 },
            ]
        }
    }
];

export default function ScenariosPage() {
    const [activeScenario, setActiveScenario] = useState<any>(null);

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <img src="/icon1.jpg" alt="Plutus" className="w-8 h-8 rounded-lg object-cover" />
                    <span className="text-xl font-bold text-gray-800">Plutus</span>
                </div>
                <div className="flex items-center space-x-4">
                    <Link href="/" className="text-gray-600 hover:text-teal-600">Dashboard</Link>
                    <Link href="/audit" className="text-gray-600 hover:text-teal-600">Audit</Link>
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto p-6">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Scenario Library</h1>
                    <p className="text-gray-600">Replay historical or hypothetical market events to see how the agent responds.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {SCENARIOS.map((scenario) => (
                        <div
                            key={scenario.id}
                            onClick={() => setActiveScenario(scenario)}
                            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${activeScenario?.id === scenario.id
                                    ? 'border-teal-600 bg-teal-50 shadow-md'
                                    : 'border-gray-100 bg-white hover:border-teal-200'
                                }`}
                        >
                            <h3 className="font-bold text-gray-900 mb-2">{scenario.title}</h3>
                            <p className="text-sm text-gray-600 mb-4">{scenario.description}</p>
                            <div className="text-teal-600 text-sm font-medium flex items-center">
                                <span>Play Scenario</span>
                                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    ))}
                </div>

                {activeScenario && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                            <h2 className="text-lg font-semibold text-gray-700">Agent Response: {activeScenario.title}</h2>
                        </div>
                        <AgentCard
                            data={activeScenario.agentResponse}
                            onApprove={() => alert('This is a simulation. Action would be approved in live mode.')}
                            onOverride={() => alert('This is a simulation. Override would be logged in live mode.')}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
