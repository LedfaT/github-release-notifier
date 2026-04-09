export interface TrackedRepository {
  id: string;
  fullName: string;
  lastSeenTag: string | null;
}

export interface ActiveSubscriber {
  email: string;
}
