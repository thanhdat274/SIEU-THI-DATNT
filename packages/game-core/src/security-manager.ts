import type { SecurityState } from '@game/shared';
import { appendIncident, emptySecurityState, openPoliceCase, sanitizeSecurity } from './security';

/** Quản lý trạng thái an ninh (security camera, police cases, incidents). */
export class SecurityManager {
  private security: SecurityState;

  constructor(initialSecurity?: SecurityState) {
    this.security = sanitizeSecurity(initialSecurity);
  }

  public load(saveData: { security?: SecurityState }): void {
    this.security = sanitizeSecurity(saveData.security);
  }

  public export(): SecurityState {
    return { ...this.security, incidents: this.security.incidents.map(i => ({ ...i })), policeCases: this.security.policeCases.map(c => ({ ...c })) };
  }

  /** Tham chiếu trực tiếp để ghi (camera, callPolice, incidents, policeCases). */
  public getRef(): SecurityState {
    return this.security;
  }

  public getSecurity(): SecurityState {
    return { ...this.security, incidents: this.security.incidents.map(i => ({ ...i })), policeCases: this.security.policeCases.map(c => ({ ...c })) };
  }
}
