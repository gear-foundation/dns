import { EntitiesService } from "../entities.service";
import { EventInfo } from "../event-info.type";
import { AdminAddedEvent } from "../../types/dns.events";
import { IDNSEventHandler } from "./dns.handler";
import { DNS } from "../../model";

export class AdminAddedHandler implements IDNSEventHandler {
  async handle(
    event: AdminAddedEvent,
    eventInfo: EventInfo,
    storage: EntitiesService
  ): Promise<void> {
    const { address } = event;
    const dns = storage.getDNS();
    if (dns === undefined) {
      console.warn(`[AdminAddedHandler] dns not found`);
      return;
    }
    await storage.setDNS(
      new DNS({
        ...dns,
        admins: [...(dns.admins || []), address],
      })
    );
  }
}
