import { EntitiesService } from "../entities.service";
import { EventInfo } from "../event-info.type";
import { ProgramIdChangedEvent } from "../../types/dns.events";
import { IDNSEventHandler } from "./dns.handler";
import { Program } from "../../model";

export class ProgramIdChangedHandler implements IDNSEventHandler {
  async handle(
    event: ProgramIdChangedEvent,
    eventInfo: EventInfo,
    storage: EntitiesService
  ): Promise<void> {
    const program = await storage.getProgram(event.name);
    if (program === undefined) {
      console.warn(`[ProgramIdChangedHandler] program not exists`);
      return;
    }
    let history = "";
    try {
      const parsedHistory = JSON.parse(program.history);

      // Convert history to array of addresses, ensuring backward compatibility
      const addressHistory: string[] = parsedHistory.map((item: any) => {
        // If it's a string (new format) - return as is
        if (typeof item === "string") {
          return item;
        }
        // If it's an object (old format: program object) - extract address
        if (typeof item === "object" && item !== null && item.address) {
          return item.address;
        }
        // Fallback for unexpected formats
        return String(item);
      });

      // Add current program address to history
      addressHistory.push(program.address);

      // Limit history to last 10 entries to prevent memory leaks
      if (addressHistory.length > 10) {
        addressHistory.splice(0, addressHistory.length - 10);
      }

      history = JSON.stringify(addressHistory);
    } catch (e) {
      // If unable to parse history, create new one with current address
      history = JSON.stringify([program.address]);
    }

    await storage.setProgram(
      new Program({
        ...program,
        admins: [...new Set([...program.admins, ...event.admins])],
        address: event.program,
        history: history,
        updatedAt: eventInfo.timestamp,
      })
    );
  }
}
