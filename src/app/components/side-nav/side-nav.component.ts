import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss']
})
export class SideNavComponent {
  @Input() selectedTab: 'profile' | 'code' | 'channel' = 'channel';
  @Output() selectedTabChange = new EventEmitter<'profile' | 'code' | 'channel'>();

  @Input() isAuthenticated = false;

  get theme() {
    return this.themeService.theme;
  }

  constructor(private themeService: ThemeService) {}

  selectTab(tab: 'profile' | 'code' | 'channel') {
    this.selectedTab = tab;
    this.selectedTabChange.emit(tab);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
