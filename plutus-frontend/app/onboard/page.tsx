'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';

export default function Onboarding() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        goal: '',
        horizon: '',
        risk: 5
    });

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
        else handleSubmit();
    };

    const handleSubmit = async () => {
        await api.createProfile({
            user_id: 'user123', // Hardcoded for demo
            goal: formData.goal,
            horizon: formData.horizon,
            risk_tolerance: formData.risk
        });
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="flex items-center justify-center space-x-2 mb-8">
                    <img src="/icon1.jpg" alt="Plutus" className="w-12 h-12 rounded-xl object-cover" />
                    <span className="text-2xl font-bold text-gray-800">Plutus</span>
                </div>

                {/* Progress */}
                <div className="flex justify-between mb-8">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className={`h-1 flex-1 mx-1 rounded-full ${s <= step ? 'bg-teal-600' : 'bg-gray-200'}`} />
                    ))}
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                    {step === 1 && "What's your primary financial goal?"}
                    {step === 2 && "How long do you plan to invest?"}
                    {step === 3 && "How much risk are you comfortable with?"}
                </h1>
                <p className="text-gray-500 text-center mb-8">
                    {step === 1 && "We'll tailor the agent's suggestions to this."}
                    {step === 2 && "Time in the market beats timing the market."}
                    {step === 3 && "Higher risk usually means higher potential returns."}
                </p>

                {/* Step 1: Goal */}
                {step === 1 && (
                    <div className="space-y-3">
                        {['Wealth Creation', 'Retirement', 'Short-term Savings', 'Education'].map((opt) => (
                            <button
                                key={opt}
                                onClick={() => setFormData({ ...formData, goal: opt })}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${formData.goal === opt ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-gray-100 hover:border-gray-200'}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                )}

                {/* Step 2: Horizon */}
                {step === 2 && (
                    <div className="space-y-3">
                        {['< 1 year', '1-3 years', '3-5 years', '5-10 years', '10+ years'].map((opt) => (
                            <button
                                key={opt}
                                onClick={() => setFormData({ ...formData, horizon: opt })}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${formData.horizon === opt ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-gray-100 hover:border-gray-200'}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                )}

                {/* Step 3: Risk */}
                {step === 3 && (
                    <div className="px-4">
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={formData.risk}
                            onChange={(e) => setFormData({ ...formData, risk: parseInt(e.target.value) })}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                        />
                        <div className="flex justify-between mt-4 text-sm font-medium text-gray-600">
                            <span>Conservative</span>
                            <span>Balanced</span>
                            <span>Aggressive</span>
                        </div>
                        <div className="mt-8 text-center">
                            <span className="text-4xl font-bold text-teal-600">{formData.risk}</span>
                            <span className="text-gray-400">/10</span>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="mt-8">
                    <button
                        onClick={handleNext}
                        disabled={(step === 1 && !formData.goal) || (step === 2 && !formData.horizon)}
                        className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold text-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                        {step === 3 ? 'Create Profile' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
}
