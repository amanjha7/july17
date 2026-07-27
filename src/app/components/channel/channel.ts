import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Appservice } from '../../services/appservice';

@Component({
  selector: 'app-channel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './channel.html',
  styleUrls: ['./channel.scss']
})
export class Channel implements OnInit, OnChanges {
  // 1. Declare websites as an @Input from parent
  @Input() websites: any[] = [];
  
  selectedWebsite: any = null;

  name: string = '';
  websiteUrl: string = '';

  isLoading: boolean = false;
  isSaving: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  copied: boolean = false;

  constructor(private appService: Appservice) {}

  ngOnInit(): void {
    this.initSelectedWebsite();
  }

  // 2. Automatically react whenever the parent passes updated 'websites'
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['websites'] && this.websites?.length > 0) {
      if (!this.selectedWebsite) {
        this.selectedWebsite = this.websites[0];
      }
    }
  }

  initSelectedWebsite() {
    if (this.websites && this.websites.length > 0 && !this.selectedWebsite) {
      this.selectedWebsite = this.websites[0];
    }
  }

  selectWebsite(site: any) {
    this.selectedWebsite = site;
    this.successMessage = '';
    this.errorMessage = '';
  }

  addNewWebsite() {
    this.selectedWebsite = null;
    this.name = '';
    this.websiteUrl = '';
    this.successMessage = '';
    this.errorMessage = '';
  }

  saveWebsiteConfig() {
    if (!this.name.trim() || !this.websiteUrl.trim()) {
      this.errorMessage = 'Please fill out both Website Name and Website URL fields.';
      return;
    }

    if (!this.websiteUrl.startsWith('http://') && !this.websiteUrl.startsWith('https://')) {
      this.websiteUrl = 'https://' + this.websiteUrl;
    }

    this.isSaving = true;
    this.successMessage = '';
    this.errorMessage = '';

    const payload = {
      name: this.name,
      website_url: this.websiteUrl
    };

    this.appService.saveWebtrackerConfig(payload).subscribe({
      next: (res: any) => {
        const savedConfig = res.config;

        this.websites.push(savedConfig);

        this.selectedWebsite = savedConfig;
        this.successMessage = 'Website configuration saved successfully!';
        this.isSaving = false;

        this.name = '';
        this.websiteUrl = '';
      },
      error: () => {
        this.errorMessage = 'Failed to save website configuration. Please try again.';
        this.isSaving = false;
      }
    });
  }

  async copyScript() {
    if (!this.selectedWebsite || !this.selectedWebsite.generated_script) return;
    await navigator.clipboard.writeText(this.selectedWebsite.generated_script);
    this.copied = true;
    setTimeout(() => this.copied = false, 2500);
  }
}