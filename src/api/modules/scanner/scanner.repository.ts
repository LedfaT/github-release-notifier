import { db } from "../../../config/db";
import { ActiveSubscriber, TrackedRepository } from "./scanner.types";

class ScannerRepository {
  async listTrackedRepositories(): Promise<TrackedRepository[]> {
    const rows = await db
      .selectFrom("repositories as r")
      .innerJoin("subscriptions as s", "s.repository_id", "r.id")
      .select([
        "r.id as id",
        "r.full_name as fullName",
        "r.last_seen_tag as lastSeenTag",
      ])
      .where("s.status", "=", "active")
      .distinct()
      .execute();

    return rows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      lastSeenTag: row.lastSeenTag,
    }));
  }

  async listActiveSubscribersByRepositoryId(
    repositoryId: string,
  ): Promise<ActiveSubscriber[]> {
    const rows = await db
      .selectFrom("subscriptions")
      .select("email")
      .where("repository_id", "=", repositoryId)
      .where("status", "=", "active")
      .distinct()
      .execute();

    return rows.map((row) => ({ email: row.email }));
  }

  async updateRepositoryScanState(
    repositoryId: string,
    data: {
      lastSeenTag?: string | null;
      lastCheckedAt: Date;
    },
  ): Promise<void> {
    const payload: {
      last_checked_at: Date;
      updated_at: Date;
      last_seen_tag?: string | null;
    } = {
      last_checked_at: data.lastCheckedAt,
      updated_at: new Date(),
    };

    if (typeof data.lastSeenTag !== "undefined") {
      payload.last_seen_tag = data.lastSeenTag;
    }

    await db
      .updateTable("repositories")
      .set(payload)
      .where("id", "=", repositoryId)
      .execute();
  }
}

export default new ScannerRepository();
