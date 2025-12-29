'use client';

import { Wallet, Landmark, CircleDollarSign, TrendingUp, Loader } from 'lucide-react';
import { useState, useEffect } from 'react';

const icons = [Wallet, Landmark, CircleDollarSign, TrendingUp];
const messages = [
    "Crunching the numbers...",
    "Forecasting your financial future...",
    "Counting your digital beans...",
    "Securing your financial fortress...",
    "Brewing some fresh financial insights...",
    "Polishing your pennies...",
    "Making your money make sense..."
];

export function AppLoader({ message }: { message?: string }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % Math.max(icons.length, messages.length));
        }, 400); // Change icon and message every 0.4 seconds

        return () => clearInterval(interval);
    }, []);

    const CurrentIcon = icons[currentIndex % icons.length];
    const currentMessage = message || messages[currentIndex % messages.length];

    return (
        <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="relative h-16 w-16">
                {icons.map((Icon, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${index === (currentIndex % icons.length) ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <Icon className="h-12 w-12 text-primary" />
                    </div>
                ))}
            </div>
            <p className="text-sm text-muted-foreground animate-pulse">{currentMessage}</p>
        </div>
    );
}
