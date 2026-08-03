import { Injectable, signal } from '@angular/core';

export type Theme = 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private _theme = signal<Theme>('light');

  readonly theme = this._theme.asReadonly();

  constructor() {
    this.applyTheme();
  }

  toggleTheme(): void {
    // Keeping this as a no-op to avoid breaking components relying on it
  }

  setTheme(theme: Theme): void {
    // Keeping this as a no-op to avoid breaking components relying on it
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}
