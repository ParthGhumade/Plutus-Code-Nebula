'use client';

import { useState, useEffect } from 'react';
import { AgentCard } from '@/components/AgentCard';
import { api } from '@/utils/api';
import Link from 'next/link';
import { PortfolioPane } from '@/components/PortfolioPane';
import { SearchPane } from '@/components/SearchPane';
import { LearningPane } from '@/components/LearningPane';
import { BadgesPane } from '@/components/BadgesPane';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';

interface PortfolioStats {
  totalValue: number;
  totalCost: number;
  dayChange: number;
  dayChangePct: number;
}

export default function Dashboard() {
  const [agentData, setAgentData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [portfolioKey, setPortfolioKey] = useState(0);
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats>({
    totalValue: 0,
    totalCost: 0,
    dayChange: 0,
    dayChangePct: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchPortfolioStats = async () => {
    try {
      const data = await api.getPortfolio('user123');
      if (data) {
        const items = data.positions || data.holdings || [];
        
        let totalValue = 0;
        let totalCost = 0;
        
        items.forEach((item: any) => {
          const qty = parseFloat(item.qty) || 0;
          const avgPrice = parseFloat(item.avg_entry_price || item.avg_price) || 0;
          const marketValue = parseFloat(item.market_value) || 0;
          const currentPrice = parseFloat(item.current_price) || (qty > 0 ? marketValue / qty : avgPrice);
          
          totalValue += marketValue || (qty * currentPrice);
          totalCost += qty * avgPrice;
        });
        
        const dayChange = totalValue - totalCost;
        const dayChangePct = totalCost > 0 ? (dayChange / totalCost) * 100 : 0;
        
        setPortfolioStats({
          totalValue,
          totalCost,
          dayChange,
          dayChangePct
        });
      }
    } catch (e) {
      console.error("Failed to fetch portfolio stats", e);
    } finally {
      setStatsLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      // Fetch pending orders as "recommendations"
      const pending = await api.getPendingOrders();
      if (pending && pending.pending_orders) {
        const mapped = pending.pending_orders.map((o: any) => {
          const p = o.raw_payload || {};
          return {
            action: (p.side || 'BUY').toUpperCase(),
            ticker: p.symbol || o.symbol || 'UNKNOWN',
            pct: 10,
            confidence: p.confidence || o.confidence || 0.75,
            top_features: p.top_features || o.top_features || [],
            explanation: p.explanation || o.explanation || "Automated recommendation",
            audit_hash: o.order_id,
            order_id: o.order_id
          };
        });
        setAgentData(mapped);
      }

      // Fetch audit log
      const log = await api.getAuditLog('user123');
      setAuditLog(Array.isArray(log) ? log : []);
      
      // Refresh portfolio stats
      await fetchPortfolioStats();
    } catch (e) {
      console.error("Failed to refresh data", e);
    }
  };

  const runAgent = async () => {
    setLoading(true);
    try {
      await api.runAgent('analyze portfolio');
      setTimeout(() => {
        refreshData();
        setLoading(false);
      }, 2000);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleApprove = async (recommendation: any, index: number) => {
    if (!recommendation.order_id) return;
    try {
      await api.confirmTrade(recommendation.order_id, true);
      alert('Trade Executed!');
      setAgentData(prev => prev.filter((_, i) => i !== index));
      refreshPortfolio();
    } catch (e) {
      alert('Failed to execute trade');
      console.error(e);
    }
  };

  const handleOverride = async (recommendation: any, reason: string, index: number) => {
    if (!recommendation.order_id) return;
    try {
      await api.confirmTrade(recommendation.order_id, false);
      alert('Recommendation Rejected/Cancelled');
      setAgentData(prev => prev.filter((_, i) => i !== index));
      refreshData();
    } catch (e) {
      alert('Failed to cancel trade');
      console.error(e);
    }
  };

  const refreshPortfolio = () => {
    setPortfolioKey(prev => prev + 1);
    refreshData();
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <img src="/icon1.jpg" alt="Plutus" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-xl font-bold text-gray-800">Plutus</span>
        </div>
        <div className="flex items-center space-x-4">
          <CurrencyDisplay />
          <Link href="/onboard" className="text-gray-600 hover:text-teal-600">Profile</Link>
          <Link href="/audit" className="text-gray-600 hover:text-teal-600">Audit</Link>
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        {/* Welcome / Stats */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{getGreeting()}, Investor</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="text-gray-500 text-sm mb-1">Portfolio Value</div>
              {statsLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-32 mb-1"></div>
                  <div className="h-4 bg-gray-100 rounded w-20"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(portfolioStats.totalValue)}
                  </div>
                  <div className={`text-sm font-medium ${portfolioStats.dayChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {portfolioStats.dayChange >= 0 ? '+' : ''}{formatCurrency(portfolioStats.dayChange)} ({portfolioStats.dayChangePct >= 0 ? '+' : ''}{portfolioStats.dayChangePct.toFixed(2)}%)
                  </div>
                </>
              )}
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="text-gray-500 text-sm mb-1">Cost Basis</div>
              {statsLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-32 mb-1"></div>
                  <div className="h-4 bg-gray-100 rounded w-20"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-teal-600">
                    {formatCurrency(portfolioStats.totalCost)}
                  </div>
                  <div className="text-gray-400 text-sm">Total Invested</div>
                </>
              )}
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
              <button
                onClick={runAgent}
                disabled={loading}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Run Agent Analysis'}
              </button>
            </div>
          </div>
        </div>

        {/* Agent Recommendations Section */}
        {agentData.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
              <h2 className="text-lg font-semibold text-gray-700">
                AI Recommendations ({agentData.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agentData.map((recommendation, index) => (
                <div key={index} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <AgentCard
                    data={recommendation}
                    onApprove={() => handleApprove(recommendation, index)}
                    onOverride={(reason) => handleOverride(recommendation, reason, index)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Badges Pane */}
        <BadgesPane />

        {/* Search & Trade Pane */}
        <SearchPane onBuyComplete={refreshPortfolio} />

        {/* Portfolio Pane */}
        <PortfolioPane key={portfolioKey} />

        {/* Learning Pane */}
        <LearningPane />

        {/* Audit Trail Preview */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Recent Activity (Audit Trail)</h2>
            <Link href="/audit" className="text-teal-600 text-sm hover:underline">View All</Link>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {auditLog.length === 0 ? (
              <div className="p-6 text-center text-gray-400">No activity yet. Run the agent to start.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {auditLog.slice(-5).reverse().map((entry, idx) => (
                  <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            entry.action === 'APPROVE' ? 'bg-green-100 text-green-700' : 
                            entry.action === 'OVERRIDE' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {entry.action}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{entry.actor || 'System'}</span>
                        </div>
                        <p className="text-sm text-gray-600">{entry.details}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </div>
                        {entry.audit_hash && (
                          <div className="text-xs font-mono text-gray-300 mt-1" title={entry.audit_hash}>
                            #{entry.audit_hash.substring(0, 8)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
