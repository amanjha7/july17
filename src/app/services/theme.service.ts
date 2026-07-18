import { Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'pronnel_theme';
  private _theme = signal<Theme>('dark');

  readonly theme = this._theme.asReadonly();

  constructor() {
    // Load persisted theme
    const saved = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') {
      this._theme.set(saved);
    } else {
      // Check system preference
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      this._theme.set(prefersLight ? 'light' : 'dark');
    }
    this.applyTheme(this._theme());
  }

  toggleTheme(): void {
    const newTheme = this._theme() === 'dark' ? 'light' : 'dark';
    this._theme.set(newTheme);
    localStorage.setItem(this.STORAGE_KEY, newTheme);
    this.applyTheme(newTheme);
  }

  setTheme(theme: Theme): void {
    this._theme.set(theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
