import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

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

  selectTab(tab: 'profile' | 'code' | 'channel') {
    this.selectedTab = tab;
    this.selectedTabChange.emit(tab);
  }
}
