import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-webhook',
  standalone: true,
  imports:[CommonModule],
  templateUrl: './code.html',
  styleUrls: ['./code.scss']
})
export class Webhook {
  @Input() url: string = 'https://plugins.pronnel.com/app31';

  copied = false;

  steps = [
    {
      title: 'Step 1: Open Developer Settings',
      description: 'In Zoho Sign, go to the Settings tab and select Developer Settings.',
      image: 'open_dev_settings.png'
    },
    {
      title: 'Step 2: Create a Webhook',
      description: 'Create a new webhook in Zoho Sign to receive notifications about document signing activities.',
      image: 'create_webhook.png'
    },
    {
      title: 'Step 3: Configure Callback URL and Events',
      hasCallback: true,
      image: 'save_webhook.png'
    }
  ];

  async copyUrl() {
    try {
      await navigator.clipboard.writeText(`${this.url}/app/common/webhook`);
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  }
}
