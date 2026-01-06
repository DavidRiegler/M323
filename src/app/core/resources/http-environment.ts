import { HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export function getOptions(token?: string, hasBody = true, params?: HttpParams) {
  const httpHeaders: Record<string, string> = { };

  if (hasBody) { httpHeaders ['Content-Type'] = 'application/json'; }
  if (token) { httpHeaders['Authorization'] = `Bearer ${token}`; }
  
  return {
    headers: new HttpHeaders(httpHeaders),
    params
  };
}

export function getServerUrl(path: string) {
  // should be placed in the environment file
  return `${environment.serverBaseUrl}${path}`;
}