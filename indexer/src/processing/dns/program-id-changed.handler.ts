import { EntitiesService } from "../entities.service";
import { EventInfo } from "../event-info.type";
import { ProgramIdChangedEvent } from "../../types/dns.events";
import { IDNSEventHandler } from "./dns.handler";
import { Program } from "../../model";

export class ProgramIdChangedHandler implements IDNSEventHandler {
  async handle(
    event: ProgramIdChangedEvent,
    eventInfo: EventInfo,
    storage: EntitiesService,
  ): Promise<void> {
    const program = await storage.getProgram(event.name);
    if (program === undefined) {
      console.warn(`[ProgramIdChangedHandler] program not exists`);
      return;
    }
    let history = '';
    try {
      const newHistory = JSON.parse(program.history);
      newHistory.push(program);
      history = JSON.stringify(newHistory)
    } catch (e) {
      history = JSON.stringify([program]);
    }
    await storage.setProgram(
      new Program({
        ...program,
        admins: [...new Set([...program.admins, ...event.admins])],
        address: event.program,
        history: history,
        updatedAt: eventInfo.timestamp,
      }),
    );
  }
}
