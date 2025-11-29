'use client';

import { useState } from 'react';
import { api } from '@/utils/api';

interface Stock {
    ticker: string;
    symbol?: string;
    name: string;
    company_name?: string;
    price: number;
    current_price?: number;
    sector: string;
    change_pct?: number;
    description?: string;
}

export function SearchPane({ onBuyComplete }: { onBuyComplete: () => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Stock[]>([]);
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
    const [buyQty, setBuyQty] = useState(1);
    const [loading, setLoading] = useState(false);
    const [buying, setBuying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setSelectedStock(null);
        setError(null);
        try {
            const data = await api.searchStocks(query);
            setResults(data || []);
        } catch (e) {
            console.error(e);
            setError('Search failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async (ticker: string) => {
        setLoading(true);
        setError(null);
        try {
            const details = await api.getStockDetails(ticker);
            if (details) {
                // Normalize the response to work with both formats
                setSelectedStock({
                    ticker: details.symbol || ticker,
                    symbol: details.symbol || ticker,
                    name: details.company_name || details.name || ticker,
                    company_name: details.company_name,
                    price: details.current_price || details.price || 0,
                    current_price: details.current_price,
                    sector: details.sector || 'Unknown',
                    change_pct: details.change_pct || 0,
                    description: details.description || `Stock information for ${ticker}`
                });
            }
            setResults([]); // Clear results to focus on details
        } catch (e) {
            console.error(e);
            setError('Failed to get stock details.');
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = async () => {
        if (!selectedStock) return;
        
        const ticker = selectedStock.ticker || selectedStock.symbol;
        if (!ticker) {
            setError('Invalid stock selected');
            return;
        }

        setBuying(true);
        setError(null);
        try {
            const result = await api.buyStock('user123', ticker, buyQty);
            alert(`Successfully bought ${buyQty} shares of ${ticker}!`);
            setSelectedStock(null);
            setQuery('');
            setBuyQty(1);
            onBuyComplete(); // Refresh portfolio
        } catch (e: any) {
            console.error('Buy error:', e);
            const errorMsg = e.message || 'Failed to buy stock. Please try again.';
            setError(errorMsg);
            alert(`Buy failed: ${errorMsg}`);
        } finally {
            setBuying(false);
        }
    };

    const getPrice = (stock: Stock) => stock.price || stock.current_price || 0;
    const getTicker = (stock: Stock) => stock.ticker || stock.symbol || '';
    const getName = (stock: Stock) => stock.name || stock.company_name || getTicker(stock);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Search & Trade</h2>

            {/* Error Display */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search stocks (e.g., AAPL, MSFT, GOOGL)"
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-gray-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors disabled:opacity-50"
                >
                    {loading ? '...' : 'Search'}
                </button>
            </form>

            {/* No Results Message */}
            {!loading && !selectedStock && results.length === 0 && query.trim() !== '' && (
                <div className="border border-gray-100 rounded-lg p-8 text-center bg-gray-50">
                    <div className="text-gray-400 text-4xl mb-2">🔍</div>
                    <p className="text-gray-600 font-medium">No results found</p>
                    <p className="text-gray-400 text-sm mt-1">Try searching for US stocks like "AAPL", "MSFT", or "GOOGL"</p>
                </div>
            )}

            {/* Results List */}
            {results.length > 0 && (
                <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 mb-4">
                    {results.map((stock) => (
                        <div
                            key={getTicker(stock)}
                            onClick={() => handleSelect(getTicker(stock))}
                            className="p-4 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                        >
                            <div>
                                <div className="font-bold text-gray-900">{getTicker(stock)}</div>
                                <div className="text-sm text-gray-500">{getName(stock)}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-medium text-gray-900">${getPrice(stock).toFixed(2)}</div>
                                <div className="text-xs text-gray-400">{stock.sector}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Selected Stock Details & Buy */}
            {selectedStock && (
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">
                                {getName(selectedStock)} ({getTicker(selectedStock)})
                            </h3>
                            <p className="text-gray-600 text-sm mt-1">{selectedStock.description}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">${getPrice(selectedStock).toFixed(2)}</div>
                            <div className={`text-sm font-medium ${(selectedStock.change_pct || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(selectedStock.change_pct || 0) >= 0 ? '+' : ''}{selectedStock.change_pct?.toFixed(2) || '0.00'}% Today
                            </div>
                        </div>
                    </div>

                    <div className="flex items-end gap-4 mt-6">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                                type="number"
                                min="1"
                                value={buyQty}
                                onChange={(e) => setBuyQty(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost</label>
                            <div className="px-4 py-2 bg-gray-200 rounded-lg text-gray-700 font-medium">
                                ${(buyQty * getPrice(selectedStock)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <button
                            onClick={handleBuy}
                            disabled={buying}
                            className="flex-1 bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700 transition-colors disabled:opacity-50 h-[42px]"
                        >
                            {buying ? 'Buying...' : 'Buy Now'}
                        </button>
                    </div>

                    <button
                        onClick={() => { setSelectedStock(null); setError(null); }}
                        className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}
