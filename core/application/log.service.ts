import type { Log } from "@/core/domain/entities";
import type { LogRepository } from "@/core/ports/repositories";
import type { RecordLogCommand } from "./commands";

/** Stores log entries sent by trusted clients (POST /api/logs). */
export class LogService {
  constructor(private readonly logs: LogRepository) {}

  record(entry: RecordLogCommand): Promise<Log> {
    return this.logs.create(entry);
  }
}
