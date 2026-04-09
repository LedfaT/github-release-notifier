import { SubscriptionStatus } from "../../../db/database.types";

export interface CreateSubscriptionResult {
  id: string;
  email: string;
  repository: string;
  status: SubscriptionStatus;
}

export interface ActiveSubscriptionResult {
  id: string;
  email: string;
  repository: string;
  status: SubscriptionStatus;
  confirmedAt: Date | null;
  createdAt: Date;
}
