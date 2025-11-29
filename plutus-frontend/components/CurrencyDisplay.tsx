'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/utils/api';

interface CurrencyData {
    learningPoints: number;
    insightPoints: number;
    streak: number;
}

export const CurrencyDisplay = () => {
    const [data, setData] = useState<CurrencyData>({ learningPoints: 0, insightPoints: 0, streak: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCurrencies = async () => {
            try {
                const result = await api.getCurrencies('user123');
                setData({
                    learningPoints: result.learningPoints || 0,
                    insightPoints: result.insightPoints || 0,
                    streak: result.streak || 0
                });
            } catch (e) {
                console.error("Failed to fetch currencies", e);
            } finally {
                setLoading(false);
            }
        };

        fetchCurrencies();
    }, []);

    if (loading) return null;

    const currencies = [
        {
            id: 'learning',
            name: 'Learning',
            icon: '📚',
            color: 'text-blue-600',
            balance: data.learningPoints
        },
        {
            id: 'insight',
            name: 'Insight',
            icon: '💡',
            color: 'text-amber-600',
            balance: data.insightPoints
        },
        {
            id: 'streak',
            name: 'Streak',
            icon: '🔥',
            color: 'text-orange-600',
            balance: data.streak
        }
    ];

    return (
        <div className="flex items-center space-x-3">
            {currencies.map((currency) => (
                <div
                    key={currency.id}
                    className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-lg border border-gray-100 shadow-sm"
                    title={`${currency.name} Points`}
                >
                    <span className="text-sm">{currency.icon}</span>
                    <span className={`text-sm font-semibold ${currency.color}`}>{currency.balance}</span>
                </div>
            ))}
        </div>
    );
};
