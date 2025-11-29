'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/utils/api';

interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
}

export const BadgesPane = () => {
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBadges = async () => {
            try {
                const data = await api.getBadges('user123');
                // Ensure data is an array
                if (Array.isArray(data)) {
                    setBadges(data);
                } else {
                    setBadges([]);
                }
            } catch (e) {
                console.error("Failed to fetch badges", e);
                setBadges([]);
            } finally {
                setLoading(false);
            }
        };

        fetchBadges();
    }, []);

    if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded-xl mb-8"></div>;

    if (badges.length === 0) {
        return (
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Achievements</h2>
                <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
                    Complete actions to earn badges!
                </div>
            </div>
        );
    }

    return (
        <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Achievements</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {badges.map((badge) => (
                    <div
                        key={badge.id}
                        className={`p-4 rounded-xl border ${badge.earned ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'}`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl mb-3 ${badge.earned ? 'bg-teal-100' : 'bg-gray-200'}`}>
                            {badge.icon || '🏆'}
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm">{badge.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
                        {badge.earned && (
                            <div className="mt-2 text-[10px] text-teal-600 font-medium bg-teal-50 inline-block px-2 py-0.5 rounded-full">
                                Earned
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
