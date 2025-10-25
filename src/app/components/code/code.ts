import { CommonModule, NgIf } from '@angular/common';
import { Component, Input, AfterViewInit } from '@angular/core';
import * as Prism from 'prismjs';
import 'prismjs/components/prism-markup';

@Component({
  selector: 'app-webhook',
  standalone: true,
  imports:[CommonModule, NgIf],
  templateUrl: './code.html',
  styleUrls: ['./code.scss']
})
export class Webhook implements AfterViewInit {
  @Input() code: string = ``

  copied = false;

  ngAfterViewInit() {
    Prism.highlightAll();
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
