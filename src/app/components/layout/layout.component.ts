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

  successMessage = '';
  errorMessage = '';
  selectedTab: 'profile' | 'code' = 'code';
  selectedAppSteps: 'TEAMS' | 'WORKFLOW' | 'RECORDING' = 'TEAMS';
  loggedout : boolean | null =null;
  userDetails: any; 

  constructor(private appService: Appservice, private route: ActivatedRoute) {}

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
              this.appService.getUserDetails().subscribe({
                next: (response) => {
                  this.userDetails = response;
                }, error: (err) => {
                  console.log('Error : ', err);
                }
              })
            } else {
                this.isAuthenticated = false;
                this.initialLoading=false;
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

}
