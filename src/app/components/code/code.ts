import { Component, Input, AfterViewChecked } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import * as Prism from 'prismjs';
import 'prismjs/components/prism-markup';

@Component({
  selector: 'app-webhook',
  standalone: true,
  imports:[CommonModule, NgIf],
  templateUrl: './code.html',
  styleUrls: ['./code.scss']
})
export class Webhook implements AfterViewChecked {
  @Input() code: string = ``;
  copied = false;

  private lastCode = '';

ngAfterViewChecked() {
  if (this.code && this.code !== this.lastCode) {
    Prism.highlightAll();
    this.lastCode = this.code;
  }
}


  async copyCode() {
    try {
      await navigator.clipboard.writeText(this.code || '');
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  }
}
