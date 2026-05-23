import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreatePasswordPage } from './create-password.page';

describe('CreatePasswordPage', () => {
  let component: CreatePasswordPage;
  let fixture: ComponentFixture<CreatePasswordPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CreatePasswordPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
