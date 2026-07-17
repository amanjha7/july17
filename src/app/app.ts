import { Component, signal } from '@angular/core';
import { LayoutComponent } from "./components/layout/layout.component";

@Component({
  selector: 'app-root',
  imports: [LayoutComponent, LayoutComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('live-chat-settings');
}
