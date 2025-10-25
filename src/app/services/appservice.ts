import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { catchError, delay, map, Observable, throwError } from 'rxjs';
import { JwtPayload, jwtDecode } from 'jwt-decode';
@Injectable({
  providedIn: 'root'
})
export class Appservice {
    constructor(private http: HttpClient) {}

  // public baseUrl: string = 'https://developerapithree.pronnel.com/desktop/app/oauth/connection'; // Backend Endpoint
  // public baseUrl: string = 'https://pronneldevapps.pronnel.com/app24'
  // public baseUrl: string = 'https://developerapi80.pronnel.com'
  public baseUrl: string = 'https://pronneldevapps.pronnel.com/app9'; // Backend Endpoint
  // public baseUrl: string = 'http://localhost:22081'
  public token:string = '';
  public apiKey:string = ''
  userDetails:any = null;
  appInstanceId:string = '';
  externalapp_version_id:any='';
    public connectionUrl: string = '/app/oauth/connection'; // Backend Endpoint
  public validationUrl: string = '/app/oauth/connection/validate';
  public instanceDetails:string='/app/oauth/connection/details';
  public connection : string = '/app/oauth/connection';
  public connectionDetails : string = '/app/oauth/connection/details';

    public userRole: string ='';


  // To hit backend and save access token
  getAccounts(apiKey:string,secret_key:string): Observable<HttpResponse<any>> {
    console.log("Sending Authorization headers", this.token);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `${this.token}`, // Ensure "Bearer" is prefixed
    });

    return this.http.post<any>(
      `${this.baseUrl}${this.connectionUrl}`,
      { api_key: apiKey, secret_key: secret_key },
      { headers, observe: 'response' } // Include full response
    );
  }

  // validate connection
  validateConnection(): Observable<HttpResponse<any>> {
    console.log("Sending Authorization headers", this.token);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `${this.token}`, // Ensure "Bearer" is prefixed
    });

    const decodedToken = jwtDecode<{ app_instance_id?: string }>(this.token);
    const appInstanceId = decodedToken?.app_instance_id || '';

    return this.http.post<any>(
      `${this.baseUrl}${this.validationUrl}`,{
        context:{
          app_instance_id:appInstanceId
        }
      },
      { headers, observe: 'response' } // Include full response
    );
  }

  // Save API Key to Backend
  saveAPIKey(apiKey: string): Observable<any> {
    const payload = { access_token:apiKey };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', Authorization: `${this.token}` });
    return this.http.post<any>(`${this.baseUrl}/app/oauth/connection`, payload, { observe: 'response', headers }).pipe(
      map((response) => {
        // Check if the status code is 200
        if (response.status === 200) {
          return response.body; // Return the response body
        } else {
          throw new Error(`${response?.body?.message || 'Invalid API Key'}`);
        }
      }),
      catchError((error) => {
        // Handle any error
        console.error('Error saving API Key:', error);
        return throwError(() => new Error(`${error?.error?.message || 'Invalid API Key'}`));
      })
    );
  }

  // Get API Key from Backend
  getAPIKeyFromBackend(): Observable<any> {
    const headers = new HttpHeaders({ 'Authorization': `${this.token}`, 'Content-Type':'application/json' });
    return this.http.get(`${this.baseUrl}/app/oauth/connection/details`, { observe: 'response', headers }).pipe(
      map((response) => {
        // Check if the status code is 200
        if (response.status === 200) {
          return response.body; // Return the response body
        } else {
          throw new Error('Failed to get API Key: Invalid response status');
        }
      }),
      catchError((error) => {
        // Handle any error
        console.error('Error getting API Key:', error);
        return throwError(() => new Error('Failed to get API Key'));
      })
    );
  }

  // getUserDetails(apikey:string): Observable<any> {
  //   const headers = new HttpHeaders({ 'Authorization': `${this.token}`, 'Content-Type':'application/json' });
  //   return this.http.post(`${this.baseUrl}/app/user/details`,{apikey}, { observe: 'response', headers }).pipe(
  //     map((response) => {
  //       // Check if the status code is 200
  //       if (response.status === 200) {
  //         return response.body; // Return the response body
  //       } else {
  //         throw new Error('Failed to get user details: Invalid response status');
  //       }
  //     }),
  //     catchError((error) => {
  //       // Handle any error
  //       console.error('Error getting user details:', error);
  //       return throwError(() => new Error('Failed to get user details'));
  //     })
  //   );
  // }

  getUserDetails(): Observable<any> {
  const headers = new HttpHeaders({ 
    'Authorization': `${this.token}`, 
    'Content-Type':'application/json' 
  });

  // Add timeout to show loader properly
  return this.http.get(`${this.baseUrl}/app/user/details`, { 
    headers,
    observe: 'response'
  }).pipe(
    map((response:any) => {
      if (response.status === 200) {
        return response.body;
      }
      throw new Error('Failed to get user details');
    }),
    catchError((error:any) => {
      return throwError(() => new Error('Authentication failed'));
    })
  );
}

  revokeApiKey(): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `${this.token}`,
      'Content-Type': 'application/json'
    });

    const options = {
      headers: headers,
      body: {
        context : {
          app_instance_id:this.appInstanceId
        }
      }
    };

    return this.http.request('DELETE', `${this.baseUrl}/app/oauth/revoke`, options);
  }



    // To hit backend and save access token
  saveTokens(accessToken: string, data: any): Observable<HttpResponse<any>> {
    console.log("Sending Authorization headers", this.token);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `${this.token}`, // Ensure "Bearer" is prefixed
    });

    return this.http.post<any>(
      `${this.baseUrl}${this.connectionUrl}`,
      { access_token: accessToken, fields: data },
      { headers, observe: 'response' } // Include full response
    );
  }

    // To get connection details
  getConnectionDetails(): Observable<HttpResponse<any>> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `${this.token}`, // Ensure "Bearer" is prefixed
    });

    return this.http.post<any>(
      `${this.baseUrl}/app/user/details`,{},
      { headers, observe: 'response' } // Include full response
    );
  }

  // Revoke Connection
  revokeConnection(): Observable<any> {
    const body = {
      context: {
        app_instance_id : this.appInstanceId
      }
    }
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `${this.token}`, // Ensure "Bearer" is prefixed
    });
    return this.http.request('DELETE',`${this.baseUrl}/app/oauth/revoke`, {body, headers});
  }

  authenticate(): any {
    const url:string = `${this.baseUrl}/app/oauth/init`
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `${this.token}`, // Ensure "Bearer" is prefixed
    })
    return this.http.get(url, {
      params: { externalapp_version_id: this.externalapp_version_id },
      headers,
      observe: 'response'
    })
  }
}
