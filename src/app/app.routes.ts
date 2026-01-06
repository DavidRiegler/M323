import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { TransferComponent } from './transfer/transfer.component';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'transfer', component: TransferComponent }
];
