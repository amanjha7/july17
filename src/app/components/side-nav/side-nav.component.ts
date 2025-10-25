import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [HeaderComponent, CommonModule],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss']
})
export class SideNavComponent {
  @Input() selectedTab: 'profile' | 'code' = 'code';
  @Output() selectedTabChange = new EventEmitter<'profile' | 'code'>();
  isCollapsed: boolean = false;

  @Input() isAuthenticated = false;
  @Output() selectedAppStepChange = new EventEmitter<'TEAMS' | 'WORKFLOW' | 'RECORDING'>();

  isSubMenuOpen = false;
  selectedAppStep: 'TEAMS' | 'WORKFLOW' | 'RECORDING' | null = null;

  selectTab(tab: 'profile' | 'code') {
    this.selectedTab = tab;
    this.selectedTabChange.emit(tab);

    // Open submenu if 'configure' is selected
  }

  selectAppStep(step: 'TEAMS' | 'WORKFLOW' | 'RECORDING') {
    this.selectedAppStep = step;
    this.isSubMenuOpen = true;  // keep submenu open
    this.selectedAppStepChange.emit(step);
  }

}

