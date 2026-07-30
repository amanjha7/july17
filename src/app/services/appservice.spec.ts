import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Appservice } from './appservice';

describe('Appservice', () => {
  let service: Appservice;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(Appservice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
