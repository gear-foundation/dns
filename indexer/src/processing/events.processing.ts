import { EventInfo } from "./event-info.type";
import { EntitiesService } from "./entities.service";
import { IStorage } from "./storage/storage.inteface";
import { HexString } from "@gear-js/api";
import { DnsEvent, DnsEventsParser, DnsEventType } from '../types/dns.events';
import { IDNSEventHandler } from './dns/dns.handler';
import { ProgramAddedHandler } from './dns/program-added.handler';
import { ProgramIdChangedHandler } from './dns/program-id-changed.handler';
import { AdminAddedHandler } from './dns/admin-added.handler';
import { AdminDeletedHandler } from './dns/admin-deleted.handler';

const dnsEventsToHandler: Record<
  DnsEventType,
  IDNSEventHandler | undefined
> = {
  [DnsEventType.AdminAdded]: new AdminAddedHandler(),
  [DnsEventType.AdminDeleted]: new AdminDeletedHandler(),
  [DnsEventType.NewProgramAdded]: new ProgramAddedHandler(),
  [DnsEventType.ProgramIdChanged]: new ProgramIdChangedHandler(),
};

export class EventsProcessing {
  constructor(
    private readonly entitiesService: EntitiesService,
    private readonly storage: IStorage,
    private readonly dnsParser: DnsEventsParser,
  ) {}

  saveAll() {
    return this.entitiesService.saveAll();
  }

  async handleDnsEvent(
    payload: HexString,
    eventInfo: EventInfo
  ): Promise<DnsEvent | null> {
    const { blockNumber, messageId } = eventInfo;
    try {
      console.log(`${blockNumber}-${messageId}: handling dns event`);
      const event = this.dnsParser.getDnsEvent(payload);
      if (!event) {
        console.warn(
          `${blockNumber}-${messageId}: unknown event type`,
          payload
        );
        return null;
      }
      console.log(
        `${blockNumber}-${messageId}: detected event: ${
          event.type
        }\n${JSON.stringify(event)}`
      );
      await this.entitiesService
        .addEvent({
          blockNumber: eventInfo.blockNumber,
          timestamp: eventInfo.timestamp,
          type: event.type,
          raw: JSON.stringify(
            event,
            (key, value) =>
              typeof value === "bigint" ? value.toString() : value // return everything else unchanged
          ),
          txHash: eventInfo.txHash,
        })
        .catch((err) =>
          console.error(`${blockNumber}-${messageId}: error adding event`, err)
        );
      const eventHandler = dnsEventsToHandler[event.type];
      if (!eventHandler) {
        console.warn(
          `${blockNumber}-${messageId}: no event handlers found for ${event.type}`
        );
        return null;
      }
      await eventHandler.handle(event, eventInfo, this.entitiesService);
      return event;
    } catch (e) {
      console.error(
        `${blockNumber}-${messageId}: error handling dns event`,
        e
      );
      return null;
    }
  }
}
