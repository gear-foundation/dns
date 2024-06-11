import { EntitiesService } from "../entities.service";
import { EventInfo } from "../event-info.type";
import { NewProgramAddedEvent } from "../../types/dns.events";
import { IDNSEventHandler } from "./dns.handler";
import { Program } from "../../model";

export class ProgramAddedHandler implements IDNSEventHandler {
  async handle(
    event: NewProgramAddedEvent,
    eventInfo: EventInfo,
    storage: EntitiesService
  ): Promise<void> {
    const program = await storage.getProgram(event.name);
    if (program !== undefined) {
      console.warn(`[ProgramAddedHandler] program already exists`);
      return;
    }
    await storage.setProgram(
      new Program({
        id: event.name,
        address: event.program,
        name: event.name,
        createdBy: eventInfo.source,
        dns: storage.getDNS(),
        history: '[]',
        updatedAt: new Date(),
        createdAt: new Date(),
      })
    );
  }
}
