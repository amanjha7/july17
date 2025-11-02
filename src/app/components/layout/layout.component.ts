import { Component } from '@angular/core';

import { ActivatedRoute } from '@angular/router';
import { catchError, finalize, of, timeout } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { Appservice } from '../../services/appservice';
import { SideNavComponent } from '../side-nav/side-nav.component';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '../loader/loader.component';
import { ProfileComponent } from '../profile/profile.component';
import { Webhook } from '../code/code';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports:[SideNavComponent, CommonModule, LoaderComponent, ProfileComponent, Webhook],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {
  accessToken = '';
  apiKey = '';
  companyDetails: any = null;
  isLoading = false;
  initialLoading = false;
  isAuthenticated = false;
  isSharedUser:boolean =false;
  baseUrl:string='https://plugins.pronnel.com/app31'
  inbox_id=''
  account_id:string=''
code: string =` `;



  successMessage = '';
  errorMessage = '';
  selectedTab: 'profile' | 'code' = 'code';
  selectedAppSteps: 'TEAMS' | 'WORKFLOW' | 'RECORDING' = 'TEAMS';
  loggedout : boolean | null =null;
  userDetails: any; 

  constructor(private appService: Appservice, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    window.addEventListener('message', this.receiveMessage);
    this.route.queryParams.subscribe(params => {
      const token = params['token'] || params['session_token'];
      if (token) {
        this.initialLoading = true;
        this.appService.token = token;
        console.log("Token ", this.appService.token);
        const decoded:any = jwtDecode(token);
        console.log(decoded, 'decdoded');
        this.appService.token = token;
        this.appService.baseUrl = decoded?.base_url;
        this.baseUrl=decoded?.base_url;
        this.appService.validateConnection().subscribe({
          next : (response:any) =>{
            console.log('Connection validated:', response);
            if(response?.body?.status === 'success'){
              this.isAuthenticated = true;
              this.initialLoading=false;
              this.inbox_id = response?.body?.inbox_id;
              this.account_id = response?.body?.account_id;
              this.code = this.generateCode(this.inbox_id, this.account_id);
              this.cdr.detectChanges();
              console.log(' resp ',response?.body, this.inbox_id )
            } else {
                this.appService.createInbox({}).subscribe({
                  next: (resp:any)=>{
                    if(resp.inbox_id){
                      this.inbox_id = resp.inbox_id
                        this.code = this.generateCode(this.inbox_id, this.account_id);
                        this.cdr.detectChanges();
                    }
                  },error:()=>{
                    this.isAuthenticated = false;
                    this.initialLoading=false;
                  },
                  complete:()=>{
                    this.isAuthenticated = false;
                    this.initialLoading=false;
                  }
                })
            }
          }, 
          error :()=>{
            this.isAuthenticated = false;
            this.initialLoading=false;
          }
        })
      }
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.receiveMessage);
  }

  receiveMessage = (event: MessageEvent) => {
    if (event?.data?.source === "react-devtools-content-script") return;
    if (event.data.access_token) this.accessToken = event.data.access_token;
    if (event.data.token) this.appService.token = event.data.token;
    if (event.data.base_url) this.appService.baseUrl = event.data.base_url;
    if (event.data.session_token) this.appService.token = event.data.session_token;
  };


generateCode(inbox_id: string, account_id:string) {
  return `
  <html>
    <body>
      <script>
        window.Papercups = {
          config: {
            token: "${account_id}",
            inbox: "${inbox_id}",
            title: "Welcome to Your company",
            subtitle: "Ask us anything in the chat window below 😊",
            primaryColor: "#1890ff",
            newMessagePlaceholder: "Start typing...",
            iconVariant: "outlined",
            baseUrl: "https://webchat.pronnel.com",
            iframeUrlOverride: "https://webchatiframe.pronnel.com",
          }
        };
      </script>
      <script type="text/javascript" async defer src="https://webchat.pronnel.com/widget.js"></script>
      <script type="text/javascript">
        window.addEventListener('message', (event) => {if (!event.data?.fileUrl) return;window.open(event.data.fileUrl, '_blank', 'noopener,noreferrer');});
      </script>
    </body>
  </html>
  `;
}

}
