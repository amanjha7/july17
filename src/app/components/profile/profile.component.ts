import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Appservice } from '../../services/appservice';

// The CDN script exposes the global `rrwebPlayer` constructor
declare var rrwebPlayer: any;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  @Input() websites:any=[]
  // ---- Data properties ----
  leads: any[] = [];
  filteredLeads: any[] = [];
  selectedLead: any = null;
  leadEvents: any[] = [];
  // websites: any[] = [];
  selectedToken: string = '';

  // ---- Player state ----
  isPlayingRecording: boolean = false;
  recordingEvents: any[] = [];
  recordingSessionId: string = '';
  isLoadingRecording: boolean = false;
  playerInstance: any = null;
  playerReady: boolean = false;

  // ---- UI state ----
  isLoading: boolean = false;
  isLoadingEvents: boolean = false;

  // ---- ViewChild for the player container ----
  @ViewChild('playerContainer') playerContainer!: ElementRef;

  constructor(private appService: Appservice, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadWebsites();
  }

  ngOnDestroy(): void {
    this.destroyPlayer();
  }

  // ---- Load websites and leads ----
  loadWebsites() {
    this.appService.getAllWebtrackerConfigs().subscribe({
      next: (res: any[]) => {
        this.websites = res || [];
        if (this.websites.length > 0 && !this.selectedToken) {
          this.selectedToken = this.websites[0].tracking_token;
          this.loadLeads();
        }
      },
      error: (err) => console.error('Failed to load websites:', err)
    });
  }

  loadLeads() {
    if (!this.selectedToken) return;
    this.isLoading = true;
    this.appService.getLeads(this.selectedToken).subscribe({
      next: (res: any) => {
        this.leads = res || [];
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

  // ---- Select a lead and load its events ----
  selectLead(lead: any) {
    this.selectedLead = lead;
    this.leadEvents = [];
    this.isPlayingRecording = false;
    this.destroyPlayer();

    if (!lead) return;

    this.isLoadingEvents = true;
    this.appService.getLeadEvents(lead._id).subscribe({
      next: (res: any) => {
        this.leadEvents = res || [];
        this.isLoadingEvents = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingEvents = false;
      }
    });
  }

  // ---- Play session ----
  playSession() {
    if (!this.selectedLead?.visitor_id) return;

    // Prefer session_id from events if available
    let sessionId = this.selectedLead.visitor_id;
    if (this.leadEvents?.length) {
      const eventWithSession = this.leadEvents.find(ev => ev.session_id);
      if (eventWithSession) sessionId = eventWithSession.session_id;
    }

    this.recordingSessionId = sessionId;
    this.isPlayingRecording = true;
    this.isLoadingRecording = true;
    this.playerReady = false;
    this.cdr.detectChanges();

    // Wait for overlay to render
    setTimeout(() => this.fetchAndPlayRecording(), 150);
  }

  // ---- Fetch recording from API ----
  private fetchAndPlayRecording() {
    const sessionId = this.recordingSessionId;

    this.appService.getSessionRecording(sessionId).subscribe({
      next: (res: any) => {
        this.isLoadingRecording = false;

        // Extract events (same logic as HTML)
        let events = res?.recordingEvents || res;
        if (!Array.isArray(events)) {
          this.recordingEvents = [];
          this.playerReady = false;
          this.cdr.detectChanges();
          return;
        }

        // Parse stringified events & filter valid ones
        this.recordingEvents = events
          .map((ev: any) => (typeof ev === 'string' ? JSON.parse(ev) : ev))
          .filter((ev: any) => ev && typeof ev === 'object' && 'type' in ev && 'timestamp' in ev)
          .sort((a: any, b: any) => a.timestamp - b.timestamp);

        console.log('✅ Recording events:', this.recordingEvents.length);
        console.log('First event:', this.recordingEvents[0]);

        if (this.recordingEvents.length === 0) {
          this.playerReady = false;
          this.cdr.detectChanges();
          return;
        }

        // Force view update
        this.cdr.detectChanges();

        // Mount after DOM paint
        requestAnimationFrame(() => {
          setTimeout(() => this.mountPlayer(), 50);
        });
      },
      error: () => {
        this.isLoadingRecording = false;
        this.recordingEvents = [];
        this.playerReady = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ---- Mount rrweb-player ----
  private mountPlayer() {
    this.destroyPlayer();

    const container = this.playerContainer?.nativeElement;
    if (!container) {
      console.warn('Player container not found – retrying...');
      setTimeout(() => this.mountPlayer(), 100);
      return;
    }

    // Ensure container has non‑zero size
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.warn('Container has zero size – retrying...', rect);
      setTimeout(() => this.mountPlayer(), 100);
      return;
    }

    if (this.recordingEvents.length === 0) {
      console.warn('No events to play');
      return;
    }

    // Clear previous content
    container.innerHTML = '';
    container.style.width = '100%';
    container.style.height = '100%';

    try {
      // Use the global rrwebPlayer – exactly like the HTML
      this.playerInstance = new rrwebPlayer({
        target: container,
        props: {
          events: this.recordingEvents,
          autoPlay: true,
          mouseTail: true,
          showController: true,
        },
      });

      this.playerReady = true;
      this.cdr.detectChanges();
      console.log('✅ Player mounted successfully (CDN).');
    } catch (err) {
      console.error('❌ rrweb-player mount error:', err);
      this.playerReady = false;
      this.cdr.detectChanges();
    }
  }

  // ---- Destroy player ----
  private destroyPlayer() {
    if (this.playerInstance) {
      try {
        if (typeof this.playerInstance.pause === 'function') this.playerInstance.pause();
        if (typeof this.playerInstance.destroy === 'function') this.playerInstance.destroy();
      } catch (e) { /* ignore */ }
      this.playerInstance = null;
    }
    if (this.playerContainer?.nativeElement) {
      this.playerContainer.nativeElement.innerHTML = '';
    }
    this.playerReady = false;
  }

  // ---- Retry ----
  retryPlayback() {
    this.fetchAndPlayRecording();
  }

  // ---- Close player ----
  closePlayer() {
    this.isPlayingRecording = false;
    this.destroyPlayer();
    this.recordingEvents = [];
    this.recordingSessionId = '';
    this.playerReady = false;
    this.cdr.detectChanges();
  }

  // ---- Helper to format duration ----
  getRecordingDuration(): string {
    if (!this.recordingEvents?.length) return '0s';
    const first = this.recordingEvents[0]?.timestamp || 0;
    const last = this.recordingEvents[this.recordingEvents.length - 1]?.timestamp || 0;
    const totalMs = last - first;
    if (totalMs <= 0) return `${this.recordingEvents.length} events`;
    const secs = Math.floor(totalMs / 1000);
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  }
}