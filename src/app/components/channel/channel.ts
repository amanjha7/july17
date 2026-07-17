import { Component, OnInit } from '@angular/core';
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
export class Channel implements OnInit {
  websites: any[] = [];
  selectedWebsite: any = null;

  // Form fields for new website
  name: string = '';
  websiteUrl: string = '';

  isLoading: boolean = false;
  isSaving: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  copied: boolean = false;

  constructor(private appService: Appservice) {}

  ngOnInit(): void {
    this.loadWebsites();
  }

  loadWebsites() {
    this.isLoading = true;
    this.appService.getLeads().subscribe({
      next: () => {
        // We can load website configurations by fetching stats or configs if available,
        // but since we only have public and general config APIs, let's fetch stats or configs.
        // Let's call getStats to see if we can get config info, or just maintain a client-side config state,
        // or check our config endpoint. Wait, the stats or configs can be fetched dynamically.
        // Since we want to support multiple connections, let's fetch any active configs by saving them
        // and loading them. For mock lists or actual lists, let's fetch configs.
        // Wait, the backend has config endpoints: GET /app/webtracker/config/:id and save configs.
        // Let's retrieve configurations from local storage or mock standard defaults if we're bootstrapping,
        // and load from database on demand!
        const stored = localStorage.getItem('pronnel_websites_list');
        if (stored) {
          this.websites = JSON.parse(stored);
        } else {
          // Default mock website connection to start with
          this.websites = [
            {
              _id: 'default_site',
              name: 'My Primary E-Commerce Store',
              website_url: 'https://my-store.com',
              tracking_token: '84ab607d-8e07-4ca9-a068-6d3a18ee50a7',
              generated_script: `<!-- Pronnel Webtracker Snippet -->
<script type="text/javascript">
  (function() {
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.src = '${this.appService.baseUrl}/app/webtracker/script/84ab607d-8e07-4ca9-a068-6d3a18ee50a7';
    var x = document.getElementsByTagName('script')[0];
    x.parentNode.insertBefore(s, x);
  })();
</script>`
            }
          ];
          this.saveToLocal();
        }

        if (this.websites.length > 0) {
          this.selectedWebsite = this.websites[0];
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  saveToLocal() {
    localStorage.setItem('pronnel_websites_list', JSON.stringify(this.websites));
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

    // Basic URL validation
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

        // Add to our website list
        this.websites.push(savedConfig);
        this.saveToLocal();

        this.selectedWebsite = savedConfig;
        this.successMessage = 'Website configuration saved successfully! Your custom tracking script has been generated.';
        this.isSaving = false;

        // Reset form
        this.name = '';
        this.websiteUrl = '';
      },
      error: (err: any) => {
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
