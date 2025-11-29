'use client';

import React from 'react';

export const LearningPane = () => {
    const videos = [
        { id: '2rAK4HoMPO4', title: 'Stock Market Basics' },
        { id: 'KgAUTqqedRc', title: 'Investment Strategies' },
        { id: 'IDPdgDNoBRg', title: 'Portfolio Management' },
    ];

    return (
        <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Learning Hub</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {videos.map((video) => (
                    <div key={video.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="relative w-full pt-[56.25%]">
                            <iframe
                                src={`https://www.youtube.com/embed/${video.id}`}
                                title={video.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute top-0 left-0 w-full h-full"
                            ></iframe>
                        </div>
                        <div className="p-3">
                            <h3 className="text-sm font-medium text-gray-900 truncate">{video.title}</h3>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
