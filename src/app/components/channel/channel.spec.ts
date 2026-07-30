import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Channel } from './channel';

describe('Channel', () => {
  let component: Channel;
  let fixture: ComponentFixture<Channel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Channel],
      providers: [provideHttpClient()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Channel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
