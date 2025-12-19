import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as Prism from 'prismjs';
import 'prismjs/components/prism-markup';

@Component({
  selector: 'app-webhook',
  standalone: true,
  imports: [CommonModule, NgIf, FormsModule],
  templateUrl: './code.html',
  styleUrls: ['./code.scss'],
})
export class Webhook implements OnChanges {
  @Input() code = ''; // FULL HTML TEMPLATE FROM BACKEND

  requireEmail = false;
  requireMobile = false;

  renderedCode = '';
  copied = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['code'] && this.code) {
      this.syncInitialValues();
      this.generateCode();
    }
  }

  /** Extract initial booleans from template ONCE */
  private syncInitialValues() {
    this.requireEmail = /requireEmailUpfront:\s*true/.test(this.code);
    this.requireMobile = /mobile:\s*true/.test(this.code);
  }

  /** Always regenerate from template */
  generateCode() {
    this.renderedCode = this.code
      .replace(/requireEmailUpfront:\s*(true|false)/, `requireEmailUpfront: ${this.requireEmail}`)
      .replace(/mobile:\s*(true|false)/, `mobile: ${this.requireMobile}`);

    setTimeout(() => Prism.highlightAll(), 0);
  }

  toggleChanged() {
    this.generateCode();
  }

  async copyCode() {
    await navigator.clipboard.writeText(this.renderedCode);
    this.copied = true;
    setTimeout(() => (this.copied = false), 2000);
  }
}
