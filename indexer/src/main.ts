import { TypeormDatabase } from "@subsquid/typeorm-store";

import { processor } from "./processor";
import { EventsProcessing } from "./processing/events.processing";
import { EventInfo } from "./processing/event-info.type";
import { Block } from "@subsquid/substrate-processor";
import { EntitiesService } from "./processing/entities.service";
import { getLocalStorage } from "./processing/storage/local.storage";
import { BatchService } from "./processing/batch.service";
import { getDnsEventsParser } from './types/dns.events';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
BigInt.prototype["toJSON"] = function () {
  return this.toString();
};

function getBlockDate(
  block: Block<{ block: { timestamp: boolean }; event: { args: boolean } }>
) {
  return new Date(block.header.timestamp ?? new Date().getTime());
}

processor.run(new TypeormDatabase(), async (ctx) => {
  const localStorage = await getLocalStorage(ctx.store);
  const entitiesService = new EntitiesService(
    localStorage,
    new BatchService(ctx.store)
  );
  const dnsParser = await getDnsEventsParser();
  const processing = new EventsProcessing(
    entitiesService,
    localStorage,
    dnsParser,
  );
  const firstBlockDate = getBlockDate(ctx.blocks[0]);
  console.log(
    `[main] start processing ${ctx.blocks.length} blocks at ${firstBlockDate}.`
  );
  for (const block of ctx.blocks) {
    const { events } = block;
    const timestamp = getBlockDate(block);
    for (const item of events) {
      const {
        message: { source, payload, details, destination, id },
      } = item.args;
      if (payload === "0x") {
        continue;
      }
      if (details && details.code.__kind !== "Success") {
        continue;
      }
      const eventInfo: EventInfo = {
        blockNumber: block.header.height,
        destination,
        source,
        timestamp,
        messageId: id,
        txHash: id,
      };
      if (localStorage.getDNS().address === source) {
        await processing.handleDnsEvent(payload, eventInfo);
      }
    }
  }
  await processing.saveAll();
});
