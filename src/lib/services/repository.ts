import { Store } from '../types';
import { initialStore } from '../mock-data';
export interface Repository {
  load(): Store;
  save(data: Store): void;
}
// Replace with an async Supabase repository. Authorize every query by authenticated business ID.
// Submit public ratings through a server endpoint; never expose unrestricted database access.
export const mockRepository: Repository = {
  load() {
    try {
      const raw = localStorage.getItem('trustpulse-demo-v2');
      if (!raw) return initialStore;
      const parsed = JSON.parse(raw);
      if (
        !parsed.business ||
        !Array.isArray(parsed.invitations) ||
        !Array.isArray(parsed.ratings) ||
        !Array.isArray(parsed.feedback) ||
        !Array.isArray(parsed.customers) ||
        !Array.isArray(parsed.reviews)
      )
        return initialStore;
      return parsed;
    } catch {
      return initialStore;
    }
  },
  save(data) {
    localStorage.setItem('trustpulse-demo-v2', JSON.stringify(data));
  },
};
