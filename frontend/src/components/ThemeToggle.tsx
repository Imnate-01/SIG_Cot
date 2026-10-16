'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
    const { setTheme, theme } = useTheme();

    return (
        <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="rounded p-2 hover:bg-white dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Toggle theme"
        >
            <div className="relative w-5 h-5">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 absolute top-0 left-0 text-sig-warning" />
                <Moon className="h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 absolute top-0 left-0 text-sig-blue" />
            </div>
        </button>
    );
}
