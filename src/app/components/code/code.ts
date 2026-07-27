import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Appservice } from '../../services/appservice';

@Component({
  selector: 'app-webhook',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './code.html',
  styleUrls: ['./code.scss'],
})
export class Webhook implements OnInit, OnDestroy {
  stats: any = null;
  websites: any[] = [];
  selectedToken: string = '';
  isLoading: boolean = false;

  refreshTimer: any = null;

  constructor(private appService: Appservice, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadWebsites();
    this.loadStats();

    // Auto-refresh stats every 10 seconds for a "Live" tracking look!
    this.refreshTimer = setInterval(() => {
      this.loadStats(true);
    }, 10000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  loadWebsites() {
    const stored = localStorage.getItem('pronnel_websites_list');
    if (stored) {
      this.websites = JSON.parse(stored);
      if (this.websites.length > 0) {
        this.selectedToken = this.websites[0].tracking_token;
      }
    }
  }

  loadStats(silent: boolean = false) {
    if (!silent) this.isLoading = true;
    this.appService.getStats(this.selectedToken).subscribe({
      next: (res: any) => {
        this.stats = res || {};

        // Ensure mock stats are beautifully populated if DB is blank,
        // matching our mock leads data so the UI remains pristine!
        if (!this.stats.totalLeads) {
          this.stats = {
            totalLeads: 0,
            identifiedLeads: 0,
            pageViews: 0,
            clicks: 0,
            formSubmits: 0,
            locations: {
  
            }
          };
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onWebsiteChange() {
    this.loadStats();
  }

  getConversionRate(): string {
    if (!this.stats || !this.stats.totalLeads) return '0.0%';
    const rate = (this.stats.identifiedLeads / this.stats.totalLeads) * 100;
    return rate.toFixed(1) + '%';
  }
}
