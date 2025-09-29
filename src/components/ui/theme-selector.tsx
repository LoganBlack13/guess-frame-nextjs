'use client';

import { useTheme } from '@/hooks/useTheme';

export default function ThemeSelector() {
  const { theme, themes, changeTheme, isLoading } = useTheme();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <span className="loading loading-spinner loading-sm" />
        <span className="text-sm">Loading theme...</span>
      </div>
    );
  }

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
        <span className="text-lg">
          {themes.find((t) => t.value === theme)?.icon || '🎨'}
        </span>
        <span className="hidden sm:inline ml-1">Theme</span>
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
      >
        {themes.map((themeOption) => (
          <li key={themeOption.value}>
            <button
              type="button"
              onClick={() => changeTheme(themeOption.value)}
              className={`flex items-center gap-3 ${
                theme === themeOption.value ? 'active' : ''
              }`}
            >
              <span className="text-lg">{themeOption.icon}</span>
              <span>{themeOption.label}</span>
              {theme === themeOption.value && (
                <span className="ml-auto text-primary">✓</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
