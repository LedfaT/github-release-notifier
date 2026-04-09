import { db } from "../../../config/db";
import {
  NewRepository,
  NewSubscription,
  Repository,
  Subscription,
  SubscriptionStatus,
  SubscriptionUpdate,
} from "../../../db/database.types";
import { ActiveSubscriptionResult } from "./subscription.types";

class SubscriptionRepository {
  async createRepository(data: {
    owner: NewRepository["owner"];
    name: NewRepository["name"];
    full_name: NewRepository["full_name"];
  }): Promise<Repository> {
    const createdRepository = await db
      .insertInto("repositories")
      .values(data)
      .onConflict((oc) => oc.column("full_name").doNothing())
      .returningAll()
      .executeTakeFirst();

    if (createdRepository) {
      return createdRepository;
    }

    const existingRepository = await db
      .selectFrom("repositories")
      .selectAll()
      .where("full_name", "=", data.full_name)
      .executeTakeFirst();

    if (!existingRepository) {
      throw new Error("Failed to create or load repository");
    }

    return existingRepository;
  }

  async findSubscriptionByEmailAndRepositoryId(
    email: string,
    repositoryId: string,
  ): Promise<Subscription | undefined> {
    return db
      .selectFrom("subscriptions")
      .selectAll()
      .where("email", "=", email)
      .where("repository_id", "=", repositoryId)
      .executeTakeFirst();
  }

  async findRepositoryById(repositoryId: string): Promise<Repository | undefined> {
    return db
      .selectFrom("repositories")
      .selectAll()
      .where("id", "=", repositoryId)
      .executeTakeFirst();
  }

  async createSubscription(data: NewSubscription): Promise<Subscription> {
    const createdSubscription = await db
      .insertInto("subscriptions")
      .values(data)
      .returningAll()
      .executeTakeFirst();

    if (!createdSubscription) {
      throw new Error("Failed to create subscription");
    }

    return createdSubscription;
  }

  async updateSubscriptionById(
    subscriptionId: string,
    data: SubscriptionUpdate,
  ): Promise<Subscription> {
    const updatedSubscription = await db
      .updateTable("subscriptions")
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where("id", "=", subscriptionId)
      .returningAll()
      .executeTakeFirst();

    if (!updatedSubscription) {
      throw new Error("Failed to update subscription");
    }

    return updatedSubscription;
  }

  async findSubscriptionByConfirmTokenHash(
    confirmTokenHash: string,
  ): Promise<Subscription | undefined> {
    return db
      .selectFrom("subscriptions")
      .selectAll()
      .where("confirm_token_hash", "=", confirmTokenHash)
      .executeTakeFirst();
  }

  async findSubscriptionByUnsubscribeTokenHash(
    unsubscribeTokenHash: string,
  ): Promise<Subscription | undefined> {
    return db
      .selectFrom("subscriptions")
      .selectAll()
      .where("unsubscribe_token_hash", "=", unsubscribeTokenHash)
      .executeTakeFirst();
  }

  async listSubscriptionsByEmailAndStatus(
    email: string,
    status: SubscriptionStatus,
  ): Promise<ActiveSubscriptionResult[]> {
    const rows = await db
      .selectFrom("subscriptions as s")
      .innerJoin("repositories as r", "r.id", "s.repository_id")
      .select([
        "s.id as id",
        "s.email as email",
        "r.full_name as repository",
        "s.status as status",
        "s.confirmed_at as confirmedAt",
        "s.created_at as createdAt",
      ])
      .where("s.email", "=", email)
      .where("s.status", "=", status)
      .orderBy("s.created_at", "desc")
      .execute();

    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      repository: row.repository,
      status: row.status,
      confirmedAt: row.confirmedAt,
      createdAt: row.createdAt,
    }));
  }
}

export default new SubscriptionRepository();
