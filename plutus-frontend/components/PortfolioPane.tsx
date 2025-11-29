'use client';

import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

interface Holding {
    ticker: string;
    qty: number;
    avg_price: number;
    current_price: number;
    market_value: number;
    unrealized_pl: number;
}

export function PortfolioPane() {
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalValue, setTotalValue] = useState(0);

    useEffect(() => {
        const fetchPortfolio = async () => {
            try {
                const data = await api.getPortfolio('user123');
                if (data) {
                    const items = data.positions || data.holdings || [];

                    const mapped = items.map((item: any) => {
                        const qty = parseFloat(item.qty) || 0;
                        const avgPrice = parseFloat(item.avg_entry_price || item.avg_price) || 0;
                        const marketValue = parseFloat(item.market_value) || 0;
                        const currentPrice = parseFloat(item.current_price) || (qty > 0 ? marketValue / qty : avgPrice);
                        const unrealizedPl = parseFloat(item.unrealized_pl) || (marketValue - (qty * avgPrice));

                        return {
                            ticker: item.symbol || item.ticker,
                            qty,
                            avg_price: avgPrice,
                            current_price: currentPrice,
                            market_value: marketValue || (qty * currentPrice),
                            unrealized_pl: unrealizedPl
                        };
                    });

                    setHoldings(mapped);
                    
                    // Calculate total
                    const total = mapped.reduce((sum: number, h: Holding) => sum + h.market_value, 0);
                    setTotalValue(total);
                }
            } catch (e) {
                console.error("Failed to fetch portfolio", e);
            } finally {
                setLoading(false);
            }
        };

        fetchPortfolio();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(value);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-100">
                    <div className="animate-pulse h-6 bg-gray-200 rounded w-40"></div>
                </div>
                <div className="p-6">
                    <div className="animate-pulse space-y-3">
                        <div className="h-10 bg-gray-100 rounded"></div>
                        <div className="h-10 bg-gray-100 rounded"></div>
                        <div className="h-10 bg-gray-100 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Current Holdings</h2>
                <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">{holdings.length} Assets</span>
                    {totalValue > 0 && (
                        <span className="text-sm font-semibold text-teal-600">
                            Total: {formatCurrency(totalValue)}
                        </span>
                    )}
                </div>
            </div>

            {holdings.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="font-medium">No holdings found</p>
                    <p className="text-sm mt-1">Search and buy stocks to build your portfolio</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium">
                            <tr>
                                <th className="px-6 py-3">Symbol</th>
                                <th className="px-6 py-3 text-right">Qty</th>
                                <th className="px-6 py-3 text-right">Avg Cost</th>
                                <th className="px-6 py-3 text-right">Current Price</th>
                                <th className="px-6 py-3 text-right">Market Value</th>
                                <th className="px-6 py-3 text-right">P/L</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {holdings.map((h, idx) => {
                                const costBasis = h.qty * h.avg_price;
                                const plPct = costBasis > 0 ? (h.unrealized_pl / costBasis) * 100 : 0;
                                const isPositive = h.unrealized_pl >= 0;

                                return (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-gray-900">{h.ticker}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-600">
                                            {h.qty.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-600">
                                            {formatCurrency(h.avg_price)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-900">
                                            {formatCurrency(h.current_price)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-900">
                                            {formatCurrency(h.market_value)}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                            <div>{isPositive ? '+' : ''}{formatCurrency(h.unrealized_pl)}</div>
                                            <div className="text-xs">
                                                ({isPositive ? '+' : ''}{plPct.toFixed(2)}%)
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-gray-50 font-medium">
                            <tr>
                                <td className="px-6 py-3 text-gray-700" colSpan={4}>Total Portfolio Value</td>
                                <td className="px-6 py-3 text-right text-gray-900 font-bold">
                                    {formatCurrency(totalValue)}
                                </td>
                                <td className="px-6 py-3 text-right">
                                    {(() => {
                                        const totalPl = holdings.reduce((sum, h) => sum + h.unrealized_pl, 0);
                                        const isPositive = totalPl >= 0;
                                        return (
                                            <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                                                {isPositive ? '+' : ''}{formatCurrency(totalPl)}
                                            </span>
                                        );
                                    })()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}
