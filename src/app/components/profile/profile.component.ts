/*
  ProfileComponent – Zoho Sign Account Overview
  -------------------------------------------------
  RUNTIME DEPENDENCIES (CDN, add to index.html <head>):

  <!-- Bootstrap 5 CSS & JS (tooltips, grid) -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <script defer src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

  <!-- Bootstrap Icons -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">

  <!-- Material Icons -->
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

  <!-- Font Awesome 6 (optional, for a few specialized pictograms) -->
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkfLT5C1Ek64qIKwFm5bG7bNQ8bT6M8Y1Y9N+8G2R3K8d+N2Y5v0d9Yng==" crossorigin="anonymous" referrerpolicy="no-referrer"/>

  NOTES
  - Using Bootstrap grid/components keeps cognition low and scan-ability high.
  - Bootstrap Icons & Material Icons cover semantics (security, webhooks, users) with immediate recognition.
  - No heavyweight chart libs; we use CSS conic-gradient for a tiny, accessible radial chart.

   * Author: Aman Jha
   * File: profile.component.ts
   * Description: Zoho Sign Account Overview component.
*/

// =========================== profile.component.ts ===========================
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {FormsModule} from '@angular/forms'

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  providers: [DatePipe]
})
export class ProfileComponent implements OnChanges {
  @Input() userDetails: any;

  // derived state
  account: any = null;
  orgs: any[] = [];
  users: any[] = [];
  features: Record<string, boolean> = {} as any;

  // summary
  createdAt?: Date;
  createdAgoDays = 0;
  license = '';
  accountId = '';
  orgName = '';
  zsoid = '';
  status = '';

  // feature metrics
  totalFeatures = 0;
  enabledFeatures = 0;
  featureCoverage = 0; // 0..100

  // quick flags for hero chips
  quickFlags: { key: string; label: string; icon: string; }[] = [
    { key: 'webhooks', label: 'Webhooks', icon: 'bi-diagram-3' },
    { key: 'embedded_signing', label: 'Embedded Signing', icon: 'bi-box-arrow-in-right' },
    { key: 'embedded_sending', label: 'Embedded Sending', icon: 'bi-send-check' },
    { key: 'templates', label: 'Templates', icon: 'bi-layers' },
    { key: 'bulk_send', label: 'Bulk Send', icon: 'bi-people' },
    { key: 'pdf_editor_sdk', label: 'PDF Editor SDK', icon: 'bi-filetype-pdf' },
    { key: 'in_person_signing', label: 'In-Person', icon: 'bi-person-badge' },
    { key: 'payment_field', label: 'Payments', icon: 'bi-credit-card' },
  ];

  // feature group design: groups mirror how brains chunk info: identity, security, flows, admin, developer, payments
  featureGroups: { name: string; icon: string; keys: string[] }[] = [
    {
      name: 'Identity & Trust Providers', icon: 'bi-shield-check', keys: [
        'EMUDHRA','EMUDHRA_AADHAAR','EMUDHRA_REMOTE','EVROTRUST','IGNISIGN','Signicat','SWISSCOM','INFOCERT','GLOBALSIGN','BIT4ID','EIDEASY','EIDEASY_ITSME','TRUSTFACTORY','USBSIGN','SINGPASS','au_digital_id','EAR_PFX','EMDHA'
      ]
    },
    {
      name: 'Security & Compliance', icon: 'bi-lock', keys: [
        'sms_otp','email_otp','offline_otp','zohoface_id','KBA','time_stamp','NOM151','blockchain','trusted_domains','custom_domains'
      ]
    },
    {
      name: 'Signing & Sending Flows', icon: 'bi-pen', keys: [
        'embedded_signing','embedded_sending','in_person_signing','delegate_signing','witness_signing','signing_groups','manages_recipients','approver'
      ]
    },
    {
      name: 'Documents & Forms', icon: 'bi-file-earmark-text', keys: [
        'templates','template_sharing','advanced_forms','signforms','attachment_field','pdf_editor_sdk','e-Stamping','cloud_signing'
      ]
    },
    {
      name: 'Admin & Organization', icon: 'bi-briefcase', keys: [
        'user_groups','custom_roles','custom_profiles','multi_org','activity_log','reports','low_credits_alert','cloud_backup','branding','feature_zia','zia_field_detection'
      ]
    },
    {
      name: 'Developer & Integrations', icon: 'bi-braces', keys: [
        'webhooks','redirection','Live Chat'
      ]
    },
    {
      name: 'Payments', icon: 'bi-cash-coin', keys: [
        'STRIPE','payment_field'
      ]
    }
  ];

  grouped: Array<{ name: string; icon: string; enabled: any[]; disabled: any[] }> = [];

  featureFilter = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.userDetails || !this.userDetails.accounts) return;
    const acc = this.userDetails.accounts;
    this.account = acc;

    // core summary
    this.orgs = acc.organizations || [];
    this.users = acc.users || [];
    this.features = acc.features || {};
    this.license = acc.license_type || (this.orgs[0]?.license_type ?? '');
    this.accountId = acc.account_id || '';
    this.orgName = acc.org_name || this.orgs[0]?.org_name || '';
    this.zsoid = acc.ZSOID || '';
    this.status = this.userDetails.status || '';

    if (acc.created_time) {
      this.createdAt = new Date(Number(acc.created_time));
      const ms = Date.now() - (this.createdAt?.getTime() ?? Date.now());
      this.createdAgoDays = Math.max(0, Math.floor(ms / 86400000));
    }

    // feature metrics
    const keys = Object.keys(this.features || {});
    this.totalFeatures = keys.length;
    this.enabledFeatures = keys.filter(k => !!this.features[k]).length;
    this.featureCoverage = this.totalFeatures ? Math.round((this.enabledFeatures / this.totalFeatures) * 100) : 0;

    // grouping
    this.grouped = this.featureGroups.map(g => {
      const enabled = g.keys.filter(k => !!this.features[k]);
      const disabled = g.keys.filter(k => this.features[k] === false || this.features[k] === undefined);
      return { name: g.name, icon: g.icon, enabled, disabled };
    });
  }

  // helpers
  getBadgeClass(val: any) {
    return val ? 'bg-success' : 'bg-secondary';
  }

  copy(text: string) {
    navigator.clipboard?.writeText(text);
  }



}

