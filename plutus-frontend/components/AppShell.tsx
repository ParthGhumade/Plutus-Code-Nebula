'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function AppShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    useEffect(() => {
        const setupBackButton = async () => {
            try {
                // Only setup Capacitor listeners if running in native app
                if (typeof window !== 'undefined' && (window as any).Capacitor) {
                    const { App } = await import('@capacitor/app');
                    App.addListener('backButton', ({ canGoBack }) => {
                        if (canGoBack) {
                            window.history.back();
                        } else {
                            App.exitApp();
                        }
                    });

                    return () => {
                        App.removeAllListeners();
                    };
                }
            } catch (e) {
                // Capacitor not available (running in browser)
                console.log('Running in browser mode');
            }
        };

        setupBackButton();
    }, [router]);

    return <>{children}</>;
}
