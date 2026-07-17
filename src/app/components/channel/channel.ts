import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-channel',
  imports: [CommonModule],
  templateUrl: './channel.html',
  styleUrl: './channel.scss',
})
export class Channel {

  channelCreationSteps:any = [
    {
      title: 'Step 1: Open Settings',
      description: 'Open Settings Panel sidebar from Top Right.',
      image: './open_settings.png'
    },
    {
      title : 'Step 2: Open Channel',
      description: 'Open Channel of Contact Board from channel Tabs in settings sidebar.',
      image: './add_channel.png'
    },
    {
      title : 'Step 3: Add New Channel',
      description: 'Create a External App Channel of Web Tracker later you can add chatbot too.',
      image: './create_channel.png'
    },
    {
      title : 'Step 4: Save Channel',
      description: 'Save The Channel that you have created of Web Tracker (External App).',
      image: './save_channel.png'
    }
  ]

}
