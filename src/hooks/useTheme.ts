'use client';

import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'synthwave' | 'cyberpunk' | 'cupcake' | 'retro';

const themes: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'synthwave', label: 'Synthwave', icon: '🌆' },
  { value: 'cyberpunk', label: 'Cyberpunk', icon: '🤖' },
  { value: 'cupcake', label: 'Cupcake', icon: '🧁' },
  { value: 'retro', label: 'Retro', icon: '📺' },
];

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('synthwave');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Récupérer le thème depuis localStorage ou utiliser le thème par défaut
    const savedTheme = localStorage.getItem('theme') as Theme;
    const initialTheme = savedTheme || 'synthwave';
    
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
    setIsLoading(false);
  }, []);

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return {
    theme,
    themes,
    changeTheme,
    isLoading,
  };
}
