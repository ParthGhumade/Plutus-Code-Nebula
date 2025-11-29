// Safe platform detection - works in browser and Capacitor
const getApiBase = (): string => {
    try {
        // Only import Capacitor if we're in a native environment
        if (typeof window !== 'undefined' && (window as any).Capacitor) {
            const platform = (window as any).Capacitor.getPlatform();
            if (platform === 'android') {
                return 'http://192.168.1.4:8000/api';
            }
        }
    } catch (e) {
        // Capacitor not available, use default
    }
    return 'http://127.0.0.1:8000/api';
};

const API_BASE = getApiBase();

export const api = {
    // ---------------------- Portfolio ----------------------
    getPortfolio: async (userId: string = 'demo') => {
        try {
            const res = await fetch(`${API_BASE}/portfolio/`);
            if (!res.ok) throw new Error('Failed to fetch portfolio');
            return res.json();
        } catch (error) {
            console.error('getPortfolio error:', error);
            return { positions: [], holdings: [] };
        }
    },

    // ---------------------- Stock Search ----------------------
    searchTicker: async (query: string) => {
        try {
            const res = await fetch(`${API_BASE}/search/ticker?query=${encodeURIComponent(query)}`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Search failed');
            return res.json();
        } catch (error) {
            console.error('searchTicker error:', error);
            return null;
        }
    },

    // ---------------------- Stock Details ----------------------
    getStockDetails: async (ticker: string) => {
        try {
            const res = await fetch(`${API_BASE}/stock/${ticker}`);
            if (!res.ok) throw new Error('Failed to get stock details');
            return res.json();
        } catch (error) {
            console.error('getStockDetails error:', error);
            return null;
        }
    },

    // ---------------------- Pending Orders ----------------------
    getPendingOrders: async () => {
        try {
            const res = await fetch(`${API_BASE}/orders/pending`);
            if (!res.ok) throw new Error('Failed to fetch pending orders');
            return res.json();
        } catch (error) {
            console.error('getPendingOrders error:', error);
            return { pending_orders: [] };
        }
    },

    // ---------------------- Run Agent ----------------------
    runAgent: async (query: string = "analyze portfolio") => {
        try {
            const res = await fetch(`${API_BASE}/agent/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, user_id: 'demo' })
            });
            if (!res.ok) throw new Error('Agent analysis failed');
            return res.json();
        } catch (error) {
            console.error('runAgent error:', error);
            return { status: 'error', recommendations: [] };
        }
    },

    // ---------------------- Trade Confirmation ----------------------
    confirmTrade: async (orderId: string, confirm: boolean) => {
        try {
            const res = await fetch(`${API_BASE}/trade/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ order_id: orderId, confirm })
            });
            if (!res.ok) throw new Error('Trade confirmation failed');
            return res.json();
        } catch (error) {
            console.error('confirmTrade error:', error);
            throw error;
        }
    },

    // ---------------------- Gamification ----------------------
    getPoints: async () => {
        try {
            const res = await fetch(`${API_BASE}/game/points`);
            if (!res.ok) throw new Error('Failed to fetch points');
            return res.json();
        } catch (error) {
            console.error('getPoints error:', error);
            return { points: 0, badges: [], streak: 0 };
        }
    },

    // ---------------------- Learning ----------------------
    getDailyLesson: async () => {
        try {
            const res = await fetch(`${API_BASE}/learn/daily`);
            if (!res.ok) throw new Error('Failed to fetch lesson');
            return res.json();
        } catch (error) {
            console.error('getDailyLesson error:', error);
            return {
                id: 'fallback',
                title: 'Understanding Markets',
                content: 'Markets are driven by supply and demand...',
                category: 'Basics',
                points_reward: 5
            };
        }
    },

    // ---------------------- Profile ----------------------
    createProfile: async (profile: any) => {
        console.log('Profile created:', profile);
        return { status: 'ok', message: 'Profile saved locally' };
    },

    // ---------------------- Audit Log ----------------------
    getAuditLog: async (userId: string = 'demo') => {
        try {
            const res = await fetch(`${API_BASE}/audit?limit=50`);
            if (!res.ok) throw new Error('Failed to fetch audit log');
            return res.json();
        } catch (error) {
            console.error('getAuditLog error:', error);
            return [];
        }
    },

    // ---------------------- Legacy Compatibility Methods ----------------------
    
    approveAction: async (userId: string, action: any) => {
        if (action.order_id) {
            return api.confirmTrade(action.order_id, true);
        }
        console.warn("Use confirmTrade instead of approveAction");
        return { status: 'error', message: 'No order_id provided' };
    },

    overrideAction: async (userId: string, action: any, reason: string) => {
        if (action.order_id) {
            return api.confirmTrade(action.order_id, false);
        }
        console.warn("Use confirmTrade(false) instead of overrideAction");
        return { status: 'error', message: 'No order_id provided' };
    },

    searchStocks: async (query: string) => {
        try {
            const data = await api.searchTicker(query);
            if (data && data.symbol) {
                return [{
                    ticker: data.symbol,
                    name: data.company_name || data.symbol,
                    price: data.current_price || 0,
                    sector: data.sector || 'Unknown',
                    change_pct: data.change_pct || 0,
                    description: data.description || ''
                }];
            }
            return [];
        } catch (error) {
            console.error('searchStocks error:', error);
            return [];
        }
    },

    buyStock: async (userId: string, ticker: string, qty: number) => {
        try {
            const res = await fetch(`${API_BASE}/post_order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: ticker,
                    side: 'buy',
                    quantity: qty,
                    order_type: 'market'
                })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || 'Buy order failed');
            }
            return res.json();
        } catch (error) {
            console.error('buyStock error:', error);
            throw error;
        }
    },

    sellStock: async (userId: string, ticker: string, qty: number) => {
        try {
            const res = await fetch(`${API_BASE}/post_order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: ticker,
                    side: 'sell',
                    quantity: qty,
                    order_type: 'market'
                })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || 'Sell order failed');
            }
            return res.json();
        } catch (error) {
            console.error('sellStock error:', error);
            throw error;
        }
    },

    getBadges: async (userId: string = 'demo') => {
        try {
            const data = await api.getPoints();
            return (data.badges || []).map((b: string) => ({
                id: b.toLowerCase().replace(/\s+/g, '_'),
                name: b,
                description: `You earned the "${b}" badge!`,
                icon: "🏆",
                earned: true
            }));
        } catch (error) {
            console.error('getBadges error:', error);
            return [];
        }
    },

    getCurrencies: async (userId: string = 'demo') => {
        try {
            const data = await api.getPoints();
            return {
                learningPoints: data.points || 0,
                insightPoints: Math.floor((data.points || 0) / 2),
                streak: data.streak || 0
            };
        } catch (error) {
            console.error('getCurrencies error:', error);
            return { learningPoints: 0, insightPoints: 0, streak: 0 };
        }
    },

    // ---------------------- Agent Analysis (Legacy) ----------------------
    getAgentAnalysis: async (symbol: string) => {
        try {
            const res = await fetch(`${API_BASE}/get_agent_analysis?symbol=${encodeURIComponent(symbol)}`);
            if (!res.ok) throw new Error('Analysis failed');
            return res.json();
        } catch (error) {
            console.error('getAgentAnalysis error:', error);
            return null;
        }
    }
};
