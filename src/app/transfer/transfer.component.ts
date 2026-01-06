import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { TransactionResourceService } from '../core/resources/transaction-resource.service';
import { AccountResourceService } from '../core/resources/account-resource.service';
import { Transaction } from '../core/resources/dto/transaction';
import { TransactionConfirmation } from '../core/resources/dto/transaction-confirmation';

@Component({
  selector: 'app-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="header">
        <h1>Money Transfer</h1>
        <button class="logout" (click)="logout()">Logout</button>
      </div>

      @if (currentUser()) {
        <div class="user-info">
          <p><strong>{{ currentUser()?.firstname }} {{ currentUser()?.lastname }}</strong></p>
          <p>BBAN: {{ currentUser()?.bban }}</p>
          <p>Balance: {{ balance() }} CHF</p>
        </div>
      }

      <div class="transfer-form">
        <h2>Send Money</h2>
        <input 
          type="text" 
          [(ngModel)]="targetAccount" 
          placeholder="Recipient BBAN (e.g. 0083 6001 0000 0000 2)">
        <input 
          type="number" 
          [(ngModel)]="amount" 
          placeholder="Amount">
        <button (click)="sendMoney()">Send</button>
        
        @if (successMessage()) {
          <p class="success">{{ successMessage() }}</p>
        }
        @if (errorMessage()) {
          <p class="error">{{ errorMessage() }}</p>
        }
      </div>

      <div class="transactions">
        <h2>Recent Transactions</h2>
        @if (transactions().length > 0) {
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              @for (tx of transactions(); track tx.date) {
                <tr>
                  <td>{{ formatDate(tx.date) }}</td>
                  <td>{{ tx.source }}</td>
                  <td>{{ tx.target }}</td>
                  <td [class.negative]="tx.amount < 0" [class.positive]="tx.amount > 0">
                    {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }} CHF
                  </td>
                  <td>{{ tx.newBalance }} CHF</td>
                </tr>
              }
            </tbody>
          </table>
          <div class="pagination">
            <button (click)="previousPage()" [disabled]="currentPage() === 1">‹</button>
            <span>Page {{ currentPage() }}</span>
            <button (click)="nextPage()" [disabled]="!hasMorePages()">›</button>
          </div>
        } @else {
          <p>No transactions yet.</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 800px;
      margin: 20px auto;
      padding: 20px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .header h1 {
      margin: 0;
    }
    
    .logout {
      padding: 8px 16px;
      background: #dc3545;
      color: white;
      border: none;
      cursor: pointer;
    }
    
    .logout:hover {
      background: #c82333;
    }
    
    .user-info {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    
    .user-info p {
      margin: 5px 0;
    }
    
    .transfer-form {
      border: 1px solid #ccc;
      padding: 20px;
      margin-bottom: 30px;
    }
    
    .transfer-form h2 {
      margin-top: 0;
    }
    
    .transfer-form input {
      display: block;
      width: 100%;
      padding: 10px;
      margin-bottom: 10px;
      border: 1px solid #ccc;
      box-sizing: border-box;
    }
    
    .transfer-form button {
      padding: 10px 20px;
      background: #28a745;
      color: white;
      border: none;
      cursor: pointer;
    }
    
    .transfer-form button:hover {
      background: #218838;
    }
    
    .transactions h2 {
      margin-bottom: 15px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    
    th {
      background: #f8f9fa;
      font-weight: bold;
    }
    
    .negative {
      color: red;
    }
    
    .positive {
      color: green;
    }
    
    .success {
      color: green;
      margin: 10px 0;
    }
    
    .error {
      color: red;
      margin: 10px 0;
    }
    
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 15px;
      margin-top: 20px;
    }
    
    .pagination button {
      padding: 8px 16px;
      background: #007bff;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 18px;
    }
    
    .pagination button:hover:not(:disabled) {
      background: #0056b3;
    }
    
    .pagination button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .pagination span {
      font-weight: bold;
    }
  `]
})
export class TransferComponent {
  private authService = inject(AuthService);
  private transactionResource = inject(TransactionResourceService);
  private accountResource = inject(AccountResourceService);
  private router = inject(Router);

  currentUser = signal(this.authService.getCurrentUser());
  balance = signal(0);
  transactions = signal<readonly TransactionConfirmation[]>([]);
  currentPage = signal(1);
  totalTransactions = signal(0);
  pageSize = 10;
  
  targetAccount = '';
  amount: number = 0;
  successMessage = signal('');
  errorMessage = signal('');

  constructor() {
    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    // Load initial data
    this.loadBalance();
    this.loadTransactions();
  }

  loadBalance() {
    const token = this.authService.getToken();
    if (token) {
      this.accountResource.getCurrentBalance(token).subscribe({
        next: (accountBalance) => {
          this.balance.set(accountBalance.balance);
        }
      });
    }
  }

  loadTransactions() {
    const token = this.authService.getToken();
    if (token) {
      const skip = (this.currentPage() - 1) * this.pageSize;
      this.transactionResource.getTransactions(token, { count: this.pageSize, skip: skip }).subscribe({
        next: (result) => {
          this.transactions.set(result.result);
          this.totalTransactions.set(result.query.resultcount);
        }
      });
    }
  }

  sendMoney() {
    this.successMessage.set('');
    this.errorMessage.set('');

    const token = this.authService.getToken();
    if (!token) {
      this.errorMessage.set('Not authenticated');
      return;
    }

    if (this.amount < 0.05) {
      this.errorMessage.set('Minimum transfer amount is 0.05 CHF');
      return;
    }

    const transaction: Transaction = {
      target: this.targetAccount,
      amount: this.amount
    };

    this.transactionResource.transfer(token, transaction).subscribe({
      next: (confirmation) => {
        this.successMessage.set(`Transfer successful! New balance: ${confirmation.newBalance} CHF`);
        this.balance.set(confirmation.newBalance);
        // Reset form
        this.targetAccount = '';
        this.amount = 0;
        // Reset to first page and reload transactions
        this.currentPage.set(1);
        this.loadTransactions();
      },
      error: (err) => {
        this.errorMessage.set('Transfer failed. Please check the account number and amount.');
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  nextPage() {
    if (this.hasMorePages()) {
      this.currentPage.update(page => page + 1);
      this.loadTransactions();
    }
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadTransactions();
    }
  }

  hasMorePages(): boolean {
    return this.currentPage() * this.pageSize < this.totalTransactions();
  }
}
