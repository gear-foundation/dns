import { EntitiesService } from "../entities.service";
import { EventInfo } from "../event-info.type";
import { AdminDeletedEvent } from "../../types/dns.events";
import { IDNSEventHandler } from "./dns.handler";
import { DNS } from "../../model";

export class AdminDeletedHandler implements IDNSEventHandler {
  async handle(
    event: AdminDeletedEvent,
    eventInfo: EventInfo,
    storage: EntitiesService
  ): Promise<void> {
    const { address } = event;
    const dns = storage.getDNS();
    if (dns === undefined) {
      console.warn(`[AdminDeletedHandler] dns not found`);
      return;
    }
    await storage.setDNS(
      new DNS({
        ...dns,
        admins: (dns.admins || []).filter((s) => s !== address),
      })
    );
  }
}
