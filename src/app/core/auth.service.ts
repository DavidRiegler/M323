import { Injectable, signal } from '@angular/core';
import { Credential } from './resources/dto/credential';
import { Account } from './resources/dto/account';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private credential = signal<Credential | null>(null);

  setCredential(credential: Credential) {
    this.credential.set(credential);
    // Store in localStorage for persistence
    localStorage.setItem('credential', JSON.stringify(credential));
  }

  getToken(): string | null {
    // Try to get from signal first
    let cred = this.credential();
    
    // If not in signal, try localStorage
    if (!cred) {
      const stored = localStorage.getItem('credential');
      if (stored) {
        cred = JSON.parse(stored);
        this.credential.set(cred);
      }
    }
    
    return cred?.token || null;
  }

  getCurrentUser(): Account | null {
    // Try to get from signal first
    let cred = this.credential();
    
    // If not in signal, try localStorage
    if (!cred) {
      const stored = localStorage.getItem('credential');
      if (stored) {
        cred = JSON.parse(stored);
        this.credential.set(cred);
      }
    }
    
    return cred?.owner || null;
  }

  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  logout() {
    this.credential.set(null);
    localStorage.removeItem('credential');
  }
}
