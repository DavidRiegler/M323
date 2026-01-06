/**
 * BWZ-Rappi - Bank of Rapperswil Backend
 * Das Backend für die Bank of Rapperswil stellt eine vereinfachte API für das Management von Finanz-Transaktionen als Übungsplattform bereit.
 * 
 * OpenAPI spec version: v0.25.2
 * 
 * Do not edit the class manually.
 *//* tslint:disable:no-unused-variable member-ordering */
import { inject, Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { getOptions, getServerUrl } from './http-environment';
import { TransactionConfirmation } from './dto/transaction-confirmation';
import { environment } from '../../../environments/environment';

/**
 * Mit dem Push Notification Service wird der Client aktiv über durchgeführte Transaktionen
 * vom Server informiert (push message).
 * 
 * Wichtig: Der Service-Worker muss im app.config.ts aktiviert werden und ist nur im release build
 * mit `npm run build` verfügbar. Das `./build` Verzeichnis muss im Anschluss mit einem anderen Server,
 * z.B. mit dem `Live Server` gestartet werden.
 */
@Injectable({providedIn: 'root'})
export class PushResourceService {
  private http = inject(HttpClient);
  private pushService = inject(SwPush);
  private subscriber: Observable<TransactionConfirmation> | null = null;
  private subscription: PushSubscription | null = null;

  /**
   * Registriert einen neuen Push Notification Client beim Server.
   * 
   * @param jwtToken Diese Methode benötigt das JWT Token des aktuell eingeloggten Benutzers (siehe Authentication Service).
   * @example Der Server sendet bei jeder Transaktion, welche den Benutzer betrifft, Push Mitteilungen an den Client. Diese werden im JSON-Format vom Typ TransactionConfirmation zum Client gesendet. Beispiel:
   * ```json
   * {
   *    "source": "0083 6001 0000 0000 2",
   *    "target": "0083 6001 0000 0000 1",
   *    "amount": 3,
   *    "newBalance": 1942.8,
   *    "date": "2025-10-06T14:20:38.191Z"
   * }
   * ```
   */
  public addSubscription(jwtToken: string): Observable<TransactionConfirmation> {
    if (!this.subscriber) {
      this.subscriber = new Observable((subscriber) => {
        this.pushService.requestSubscription({ // ask for user permission and generate push secret (includes notification url)
          serverPublicKey: environment.push.publicKey
        }).then(subs => {
          this.subscription = subs;
          this.registerSubscription(jwtToken, subs).subscribe({ // register notification url on server
            next: () => {
              this.pushService.messages.subscribe( { // subscribe to WebWorker and wait for push messages
                next: (msg: any) => subscriber.next(msg),
                error: (err) => subscriber.error(err)
              });
            },
            error: (err) => subscriber.error(err)
          });
        }).catch(err => subscriber.error(err));
      });
    }
    return this.subscriber;
  }

  /**
   * De-Registriert eine existierende Push Notification vom Server.
   * 
   * @param jwtToken Diese Methode benötigt das JWT Token des aktuell eingeloggten Benutzers (siehe Authentication Service).
   * ```
   */
  public removeSubscription(jwtToken: string): Observable<void> {
    return new Observable(subscriber => {
      const subscr = this.subscription;
      this.subscriber = null;
      this.subscription = null;

      if (subscr) {
        this.pushService.unsubscribe().finally(() => {
          this.unregisterSubscription(jwtToken, subscr).subscribe({
            next: () => {
              subscriber.next();
              subscriber.complete();
            },
            error: (err) => subscriber.error(err)
          });
        })
      } else {
        subscriber.next();
        subscriber.complete();
      }
    });
  }

  private registerSubscription(jwtToken: string, subscription: PushSubscription) {
    return this.http.post<TransactionConfirmation>(
      getServerUrl('/push/add-subscription'),
      JSON.stringify(subscription),
      getOptions(jwtToken));
  }

  private unregisterSubscription(jwtToken: string, subscription: PushSubscription): Observable<unknown> {
    return this.http.post(
      getServerUrl('/push/remove-subscription'),
      JSON.stringify(subscription),
      getOptions(jwtToken));
  }
}
