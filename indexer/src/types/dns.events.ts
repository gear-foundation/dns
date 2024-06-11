import { Sails, getFnNamePrefix, getServiceNamePrefix } from "sails-js";
import { readFileSync } from "fs";
import { HexString } from "@gear-js/api";
import { ActorId } from "../dns-types/lib";

let instance: DnsEventsParser | undefined;

export async function getDnsEventsParser(): Promise<DnsEventsParser> {
  if (!instance) {
    instance = new DnsEventsParser();
    await instance.init();
  }
  return instance;
}

export enum DnsEventType {
  AdminAdded = "AdminAdded",
  AdminDeleted = "AdminDeleted",
  NewProgramAdded = "NewProgramAdded",
  ProgramIdChanged = "ProgramIdChanged",
}

export type AdminAddedEvent = {
  type: DnsEventType.AdminAdded;
  address: string;
};

export type AdminDeletedEvent = {
  type: DnsEventType.AdminDeleted;
  address: string;
};

export type NewProgramAddedEvent = {
  type: DnsEventType.NewProgramAdded;
  program: string;
  name: string;
};

export type ProgramIdChangedEvent = {
  type: DnsEventType.ProgramIdChanged;
  program: string;
  name: string;
  updatedAt: Date | null;
};

export type DnsEvent =
  | AdminAddedEvent
  | AdminDeletedEvent
  | NewProgramAddedEvent
  | ProgramIdChangedEvent;

export class DnsEventsParser {
  private sails?: Sails;

  async init() {
    const idl = readFileSync("./assets/dns.idl", "utf-8");
    this.sails = await Sails.new();

    this.sails.parseIdl(idl);
  }

  getDnsEvent(payload: HexString): DnsEvent | undefined {
    if (!this.sails) {
      throw new Error(`sails is not initialized`);
    }
    const serviceName = getServiceNamePrefix(payload);
    const functionName = getFnNamePrefix(payload);
    if (!this.sails.services[serviceName].events[functionName]) {
      return undefined;
    }
    const ev =
      this.sails.services[serviceName].events[functionName].decode(payload);
    switch (functionName) {
      case "AdminAdded": {
        const event = ev as { new_admin: ActorId };
        return {
          type: DnsEventType.AdminAdded,
          address: event.new_admin.toString(),
        };
      }
      case "NewProgramAdded": {
        const event = ev as {
          name: string;
          program_id: ActorId;
        };
        return {
          type: DnsEventType.NewProgramAdded,
          program: event.program_id.toString(),
          name: event.name,
        };
      }
      case "ProgramIdChanged": {
        const event = ev as {
          name: string;
          program_id: ActorId;
          date: string;
        };
        return {
          type: DnsEventType.ProgramIdChanged,
          program: event.program_id.toString(),
          name: event.name,
          updatedAt: event.date ? new Date(event.date) : null,
        };
      }
    }
    return undefined;
  }
}
