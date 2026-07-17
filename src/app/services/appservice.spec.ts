import { TestBed } from '@angular/core/testing';

import { Appservice } from './appservice';

describe('Appservice', () => {
  let service: Appservice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Appservice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
