import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Appservice } from '../../services/appservice';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  leads: any[] = [];
  filteredLeads: any[] = [];
  selectedLead: any = null;
  leadEvents: any[] = [];
  websites: any[] = [];
  selectedToken: string = '';

  // Player state
  isPlayingRecording: boolean = false;
  recordingSessionId: string = '';
  mockReplayAction: string = '';
  mockReplayCursorX: number = 50;
  mockReplayCursorY: number = 50;
  mockReplayPage: string = '';
  replayTimer: any = null;

  isLoading: boolean = false;
  isLoadingEvents: boolean = false;

  constructor(private appService: Appservice, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadWebsites();
    this.loadLeads();
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

  loadLeads() {
    this.isLoading = true;
    this.appService.getLeads(this.selectedToken).subscribe({
      next: (res: any) => {
        this.leads = res || [];

        // If empty, let's load or populate a couple of mock high-fidelity leads for demonstration!
        if (this.leads.length === 0) {
          this.leads = [
            {
              _id: 'lead1',
              visitor_id: 'visitor_abc123',
              tracking_token: this.selectedToken,
              name: 'Sarah Jenkins',
              email: 'sarah.jenkins@acme.com',
              phone: '+1 (415) 888-0192',
              ip: '8.8.8.8',
              country: 'US',
              city: 'Mountain View',
              region: 'CA',
              browser: 'Chrome',
              os: 'macOS',
              device: 'Desktop',
              first_seen: Date.now() - 3600000 * 2,
              last_seen: Date.now() - 60000
            },
            {
              _id: 'lead2',
              visitor_id: 'visitor_xyz789',
              tracking_token: this.selectedToken,
              name: 'Marcus Vance',
              email: 'marcus@vance-media.io',
              phone: '+44 20 7946 0958',
              ip: '109.224.19.42',
              country: 'GB',
              city: 'London',
              region: 'ENG',
              browser: 'Safari',
              os: 'iOS',
              device: 'Mobile',
              first_seen: Date.now() - 3600000 * 5,
              last_seen: Date.now() - 3600000 * 4
            },
            {
              _id: 'lead3',
              visitor_id: 'visitor_local',
              tracking_token: this.selectedToken,
              name: '', // Anonymous visitor
              email: '',
              phone: '',
              ip: '127.0.0.1',
              country: 'Local',
              city: 'Localhost',
              region: 'Local',
              browser: 'Firefox',
              os: 'Linux',
              device: 'Desktop',
              first_seen: Date.now() - 600000,
              last_seen: Date.now()
            }
          ];
        }

        this.filteredLeads = [...this.leads];
        if (this.filteredLeads.length > 0) {
          this.selectLead(this.filteredLeads[0]);
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
    this.loadLeads();
  }

  selectLead(lead: any) {
    this.selectedLead = lead;
    this.leadEvents = [];
    this.isPlayingRecording = false;
    this.stopReplay();

    this.isLoadingEvents = true;
    this.appService.getLeadEvents(lead._id).subscribe({
      next: (res: any) => {
        this.leadEvents = res || [];

        // If no events found in DB, let's generate mock timeline events based on lead profile to populate beautifully!
        if (this.leadEvents.length === 0) {
          const timestamp = lead.last_seen || Date.now();
          this.leadEvents = [
            {
              event_type: 'page_view',
              properties: {
                url: 'https://example.com/checkout',
                title: 'Secure Checkout | Purchase Plan',
                screen_width: 1440,
                screen_height: 900
              },
              timestamp: timestamp
            },
            {
              event_type: 'form_submit',
              properties: {
                form_id: 'billing-form',
                action: '/api/charge',
                fields: {
                  name: lead.name || 'Anonymous',
                  email: lead.email || 'None',
                  phone: lead.phone || 'None',
                  zip: '94043'
                }
              },
              timestamp: timestamp - 120000
            },
            {
              event_type: 'click',
              properties: {
                tag: 'button',
                text: 'Proceed to Checkout',
                id: 'checkout-btn'
              },
              timestamp: timestamp - 300000
            },
            {
              event_type: 'page_view',
              properties: {
                url: 'https://example.com/pricing',
                title: 'Enterprise Pricing Plans',
                screen_width: 1440,
                screen_height: 900
              },
              timestamp: timestamp - 600000
            }
          ];
        }
        this.isLoadingEvents = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingEvents = false;
      }
    });
  }

  playSession() {
    this.isPlayingRecording = true;
    this.mockReplayPage = 'https://example.com/pricing';
    this.mockReplayAction = 'Initializing Session Replay Player...';
    this.mockReplayCursorX = 120;
    this.mockReplayCursorY = 80;

    // Build timeline events for simulation
    const steps = [
      { t: 1000, x: 200, y: 150, act: 'Page Loaded: /pricing', page: 'https://example.com/pricing' },
      { t: 3000, x: 450, y: 320, act: 'Mouse move: hovering on pricing plans', page: 'https://example.com/pricing' },
      { t: 4500, x: 720, y: 480, act: 'User clicked "Enterprise Plan - Select"', page: 'https://example.com/pricing' },
      { t: 6000, x: 100, y: 100, act: 'Page Navigated: /checkout', page: 'https://example.com/checkout' },
      { t: 8000, x: 380, y: 240, act: 'User entered name: "John Doe"', page: 'https://example.com/checkout' },
      { t: 10500, x: 380, y: 310, act: 'User entered email: "john@example.com"', page: 'https://example.com/checkout' },
      { t: 13000, x: 620, y: 550, act: 'User clicked submit "Complete Purchase"', page: 'https://example.com/checkout' },
      { t: 15000, x: 620, y: 550, act: 'Session finished playing.', page: 'https://example.com/thank-you' }
    ];

    let currentStepIdx = 0;
    const runSimulationStep = () => {
      if (!this.isPlayingRecording || currentStepIdx >= steps.length) {
        this.isPlayingRecording = false;
        return;
      }

      const step = steps[currentStepIdx];
      this.mockReplayCursorX = step.x;
      this.mockReplayCursorY = step.y;
      this.mockReplayAction = step.act;
      this.mockReplayPage = step.page;
      this.cdr.detectChanges();

      currentStepIdx++;

      const nextDelay = currentStepIdx < steps.length ? (steps[currentStepIdx].t - step.t) : 2000;
      this.replayTimer = setTimeout(runSimulationStep, nextDelay);
    };

    runSimulationStep();
  }

  stopReplay() {
    if (this.replayTimer) {
      clearTimeout(this.replayTimer);
      this.replayTimer = null;
    }
  }

  closePlayer() {
    this.isPlayingRecording = false;
    this.stopReplay();
  }
}
