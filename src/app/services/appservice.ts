import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { catchError, delay, map, Observable, throwError } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class Appservice {
  constructor(private http: HttpClient) {}

  public baseUrl: string = 'http://localhost:8888'; // Will be overridden dynamically by JWT Token or host URL
  public token: string = '';
  public appInstanceId: string = '';
  public externalapp_version_id: any = '';

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `${this.token}`
    });
  }

  // Validate connection and set baseUrl dynamically
  validateConnection(): Observable<HttpResponse<any>> {
    const headers = this.getHeaders();
    const decodedToken = jwtDecode<{ app_instance_id?: string, base_url?: string }>(this.token);
    this.appInstanceId = decodedToken?.app_instance_id || '';
    if (decodedToken?.base_url) {
      this.baseUrl = decodedToken.base_url;
    }

    return this.http.post<any>(
      `${this.baseUrl}/app/oauth/connection/validate`,
      {
        context: {
          app_instance_id: this.appInstanceId
        }
      },
      { headers, observe: 'response' }
    );
  }

  // --- Webtracker Service APIs ---

  // Save/Create Webtracker Config
  saveWebtrackerConfig(data: { website_url: string, name: string, pronnel_user_id?: string, org_id?: string, app_instance_id?: string }): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post<any>(`${this.baseUrl}/app/webtracker/config`, {
      ...data,
      app_instance_id: this.appInstanceId || undefined
    }, { headers });
  }

  // Fetch Webtracker Config Details
  getWebtrackerConfig(id: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${this.baseUrl}/app/webtracker/config/${id}`, { headers });
  }

  // Fetch Leads/Visitors
  getLeads(token?: string): Observable<any> {
    const headers = this.getHeaders();
    let url = `${this.baseUrl}/app/webtracker/leads`;
    if (token) {
      url += `?token=${token}`;
    }
    return this.http.get<any>(url, { headers });
  }

  // Fetch Events for Lead
  getLeadEvents(leadId: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${this.baseUrl}/app/webtracker/leads/${leadId}/events`, { headers });
  }

  // Fetch Session Recording (rrweb frames)
  getSessionRecording(sessionId: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${this.baseUrl}/app/webtracker/sessions/${sessionId}/recording`, { headers });
  }

  // Fetch Statistics / Insights
  getStats(token?: string): Observable<any> {
    const headers = this.getHeaders();
    let url = `${this.baseUrl}/app/webtracker/stats`;
    if (token) {
      url += `?token=${token}`;
    }
    return this.http.get<any>(url, { headers });
  }

  // Legacy/Livechat compatibilities
  createInbox(data: any): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post<any>(`${this.baseUrl}/app/create/inboxes`, data, { headers });
  }
}
