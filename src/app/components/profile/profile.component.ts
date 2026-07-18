import { Component, OnInit, AfterViewInit, ChangeDetectorRef, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Appservice } from '../../services/appservice';
import rrwebPlayer from 'rrweb-player';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, AfterViewInit, OnDestroy {
  leads: any[] = [];
  filteredLeads: any[] = [];
  selectedLead: any = null;
  leadEvents: any[] = [];
  websites: any[] = [];
  selectedToken: string = '';
  sessionsList: any[] = [];

  // Player state
  isPlayingRecording: boolean = false;
  recordingEvents: any[] = [];
  recordingSessionId: string = '';
  isLoadingRecording: boolean = false;
  playerInstance: any = null;

  // Player controls state (for custom UI)
  playerReady: boolean = false;

  isLoading: boolean = false;
  isLoadingEvents: boolean = false;
  isLoadingSessions: boolean = false;

  @ViewChild('playerContainer') playerContainer!: ElementRef;

  constructor(private appService: Appservice, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadWebsites();
    this.loadLeads();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.destroyPlayer();
  }

  loadWebsites() {
    this.appService.getAllWebtrackerConfigs().subscribe({
      next: (res: any[]) => {
        this.websites = res || [];
        if (this.websites.length > 0 && !this.selectedToken) {
          this.selectedToken = this.websites[0].tracking_token;
          this.loadLeads();
        }
      }
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

  selectLead(lead: any) {
    this.selectedLead = lead;
    this.leadEvents = [];
    this.sessionsList = [];
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

  playSession() {
    if (!this.selectedLead?.visitor_id) return;

    this.recordingSessionId = this.selectedLead.visitor_id;
    this.isPlayingRecording = true;
    this.isLoadingRecording = true;
    this.playerReady = false;

    this.cdr.detectChanges();

    // Use visitor_id as session identifier to fetch recordings
    // Also try to find sessions from events
    setTimeout(() => {
      this.fetchAndPlayRecording();
    }, 100);
  }

  private fetchAndPlayRecording() {
    const sessionId = this.recordingSessionId;

    this.appService.getSessionRecording(sessionId).subscribe({
      next: (res: any) => {
        this.isLoadingRecording = false;

        if (res && res.events && res.events.length > 0) {
          this.recordingEvents = res.events;
          this.cdr.detectChanges();
          // Mount player after view is updated
          setTimeout(() => this.mountPlayer(), 50);
        } else {
          // No recorded session found - show empty state
          this.recordingEvents = [];
          this.playerReady = false;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.isLoadingRecording = false;
        this.recordingEvents = [];
        this.playerReady = false;
        this.cdr.detectChanges();
      }
    });
  }

  private mountPlayer() {
    this.destroyPlayer();

    if (!this.playerContainer?.nativeElement || this.recordingEvents.length === 0) {
      return;
    }

    try {
      // Create a wrapper for rrweb-player
      const wrapper = document.createElement('div');
      wrapper.id = 'rrweb-player-wrapper';
      wrapper.style.width = '100%';
      wrapper.style.height = '100%';
      wrapper.style.overflow = 'hidden';
      this.playerContainer.nativeElement.innerHTML = '';
      this.playerContainer.nativeElement.appendChild(wrapper);

      this.playerInstance = new rrwebPlayer({
        target: wrapper,
        props: {
          events: this.recordingEvents,
          width: this.playerContainer.nativeElement.clientWidth || 800,
          height: this.playerContainer.nativeElement.clientHeight || 450,
          autoPlay: true,
          showController: true,
          tags: {},
          skipInactive: true,
          speed: 1,
          mouseTail: true
        }
      });

      this.playerReady = true;
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Failed to mount rrweb-player:', err);
      this.playerReady = false;
    }
  }

  private destroyPlayer() {
    if (this.playerInstance) {
      try {
        this.playerInstance.pause();
        this.playerInstance = null;
      } catch (e) {
        this.playerInstance = null;
      }
    }
    if (this.playerContainer?.nativeElement) {
      this.playerContainer.nativeElement.innerHTML = '';
    }
    this.playerReady = false;
  }

  retryPlayback() {
    this.fetchAndPlayRecording();
  }

  closePlayer() {
    this.isPlayingRecording = false;
    this.destroyPlayer();
    this.recordingEvents = [];
    this.recordingSessionId = '';
    this.playerReady = false;
  }

  getRecordingDuration(): string {
    if (!this.recordingEvents || this.recordingEvents.length === 0) return '0s';
    const first = this.recordingEvents[0]?.timestamp || 0;
    const last = this.recordingEvents[this.recordingEvents.length - 1]?.timestamp || 0;
    const totalMs = last - first;
    if (totalMs <= 0) return `${this.recordingEvents.length} events`;
    const secs = Math.floor(totalMs / 1000);
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  }
}
