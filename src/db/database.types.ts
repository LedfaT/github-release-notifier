import {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export type SubscriptionStatus = "pending" | "active" | "unsubscribed";

export interface RepositoriesTable {
  id: Generated<string>;
  owner: string;
  name: string;
  full_name: string;
  last_seen_tag: string | null;
  last_checked_at: ColumnType<
    Date | null,
    Date | string | null | undefined,
    Date | string | null
  >;
  created_at: ColumnType<Date, Date | string | undefined, never>;
  updated_at: ColumnType<
    Date,
    Date | string | undefined,
    Date | string | undefined
  >;
}

export interface SubscriptionsTable {
  id: Generated<string>;
  email: string;
  repository_id: string;
  status: SubscriptionStatus;
  confirm_token_hash: string | null;
  unsubscribe_token_hash: string;
  confirmed_at: ColumnType<
    Date | null,
    Date | string | null | undefined,
    Date | string | null
  >;
  unsubscribed_at: ColumnType<
    Date | null,
    Date | string | null | undefined,
    Date | string | null
  >;
  created_at: ColumnType<Date, Date | string | undefined, never>;
  updated_at: ColumnType<
    Date,
    Date | string | undefined,
    Date | string | undefined
  >;
}

export interface Database {
  repositories: RepositoriesTable;
  subscriptions: SubscriptionsTable;
}

export type Repository = Selectable<RepositoriesTable>;
export type NewRepository = Insertable<RepositoriesTable>;
export type RepositoryUpdate = Updateable<RepositoriesTable>;

export type Subscription = Selectable<SubscriptionsTable>;
export type NewSubscription = Insertable<SubscriptionsTable>;
export type SubscriptionUpdate = Updateable<SubscriptionsTable>;
