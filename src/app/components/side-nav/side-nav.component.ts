import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss']
})
export class SideNavComponent implements OnInit {
  @Input() selectedTab: 'profile' | 'code' | 'channel' = 'channel';
  @Output() selectedTabChange = new EventEmitter<'profile' | 'code' | 'channel'>();

  @Input() isAuthenticated = false;

  isDarkMode: boolean = true;

  ngOnInit(): void {
    // Read from localStorage to persist theme choice!
    const savedTheme = localStorage.getItem('webtracker_theme');
    if (savedTheme === 'light') {
      this.isDarkMode = false;
      document.body.classList.add('light-theme');
    } else {
      this.isDarkMode = true;
      document.body.classList.remove('light-theme');
    }
  }

  selectTab(tab: 'profile' | 'code' | 'channel') {
    this.selectedTab = tab;
    this.selectedTabChange.emit(tab);
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.body.classList.remove('light-theme');
      localStorage.setItem('webtracker_theme', 'dark');
    } else {
      document.body.classList.add('light-theme');
      localStorage.setItem('webtracker_theme', 'light');
    }
  }
}
