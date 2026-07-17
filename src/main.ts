import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { routes } from './app/app.routes';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import '@angular/localize/init';

bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),
    provideHttpClient(),
    provideRouter(routes, withComponentInputBinding())
  ]
}).catch((err) => console.error(err));
