import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationResourceService } from '../core/resources/authentication-resource.service';
import { AuthService } from '../core/auth.service';
import { LoginInfo } from '../core/resources/dto/login-info';
import { RegistrationInfo } from '../core/resources/dto/registration-info';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <h1>Bank App Login</h1>
      
      <div class="form-container">
        <div class="tabs">
          <button [class.active]="!showRegister()" (click)="showRegister.set(false)">Login</button>
          <button [class.active]="showRegister()" (click)="showRegister.set(true)">Register</button>
        </div>

        @if (!showRegister()) {
          <div class="form">
            <input type="text" [(ngModel)]="loginData.login" placeholder="Username">
            <input type="password" [(ngModel)]="loginData.password" placeholder="Password">
            <button (click)="login()">Login</button>
            @if (errorMessage()) {
              <p class="error">{{ errorMessage() }}</p>
            }
          </div>
        } @else {
          <div class="form">
            <input type="text" [(ngModel)]="registerData.firstname" placeholder="First Name">
            <input type="text" [(ngModel)]="registerData.lastname" placeholder="Last Name">
            <input type="text" [(ngModel)]="registerData.login" placeholder="Username">
            <input type="password" [(ngModel)]="registerData.password" placeholder="Password">
            <input type="password" [(ngModel)]="passwordConfirmation" placeholder="Confirm Password">
            <button (click)="register()">Register</button>
            @if (errorMessage()) {
              <p class="error">{{ errorMessage() }}</p>
            }
            @if (successMessage()) {
              <p class="success">{{ successMessage() }}</p>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 400px;
      margin: 50px auto;
      padding: 20px;
      color: black;
    }
    
    h1 {
      text-align: center;
      margin-bottom: 30px;
      color: black;
    }
    
    .tabs {
      display: flex;
      margin-bottom: 20px;
    }
    
    .tabs button {
      flex: 1;
      padding: 10px;
      border: 1px solid #ccc;
      background: #f5f5f5;
      cursor: pointer;
    }
    
    .tabs button.active {
      background: white;
      border-bottom: none;
    }
    
    .form {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 20px;
      border: 1px solid #ccc;
      border-top: none;
    }
    
    input {
      padding: 10px;
      border: 1px solid #ccc;
    }
    
    button {
      padding: 10px;
      background: #007bff;
      color:  black;
      border: none;
      cursor: pointer;
    }
    
    button:hover {
      background: #0056b3;
    }
    
    .error {
      color: red;
      margin: 0;
    }
    
    .success {
      color: green;
      margin: 0;
    }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private authResource = inject(AuthenticationResourceService);
  private router = inject(Router);

  showRegister = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  loginData: LoginInfo = {
    login: '',
    password: ''
  };

  registerData: RegistrationInfo = {
    firstname: '',
    lastname: '',
    login: '',
    password: ''
  };

  passwordConfirmation = '';

  login() {
    this.errorMessage.set('');
    
    if (this.loginData.login.length <= 3) {
      this.errorMessage.set('Username must be longer than 3 characters');
      return;
    }
    
    if (this.loginData.password.length <= 3) {
      this.errorMessage.set('Password must be longer than 3 characters');
      return;
    }
    
    this.authResource.login(this.loginData).subscribe({
      next: (credential) => {
        if (credential) {
          this.authService.setCredential(credential);
          this.router.navigate(['/transfer']);
        } else {
          this.errorMessage.set('Invalid username or password');
        }
      },
      error: (err) => {
        this.errorMessage.set('Login failed');
      }
    });
  }

  register() {
    this.errorMessage.set('');
    this.successMessage.set('');
    
    if (this.registerData.firstname.length <= 3) {
      this.errorMessage.set('First name must be longer than 3 characters');
      return;
    }
    
    if (this.registerData.lastname.length <= 3) {
      this.errorMessage.set('Last name must be longer than 3 characters');
      return;
    }
    
    if (this.registerData.login.length <= 3) {
      this.errorMessage.set('Username must be longer than 3 characters');
      return;
    }
    
    if (this.registerData.password.length <= 3) {
      this.errorMessage.set('Password must be longer than 3 characters');
      return;
    }
    
    if (this.registerData.password !== this.passwordConfirmation) {
      this.errorMessage.set('Passwords do not match');
      return;
    }
    
    this.authResource.register(this.registerData).subscribe({
      next: (account) => {
        // Auto-login after successful registration
        const loginInfo: LoginInfo = {
          login: this.registerData.login,
          password: this.registerData.password
        };
        
        this.authResource.login(loginInfo).subscribe({
          next: (credential) => {
            if (credential) {
              this.authService.setCredential(credential);
              this.router.navigate(['/transfer']);
            }
          },
          error: (err) => {
            this.errorMessage.set('Registration successful but auto-login failed. Please login manually.');
          }
        });
      },
      error: (err) => {
        this.errorMessage.set('Registration failed. Username might be taken.');
      }
    });
  }
}
