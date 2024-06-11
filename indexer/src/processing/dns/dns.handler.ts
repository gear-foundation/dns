import { EntitiesService } from "../entities.service";
import { EventInfo } from "../event-info.type";
import { DnsEvent } from "../../types/dns.events";

export interface IDNSEventHandler {
  handle(
    event: DnsEvent,
    eventInfo: EventInfo,
    storage: EntitiesService
  ): Promise<void>;
}
