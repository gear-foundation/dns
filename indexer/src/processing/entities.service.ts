import { DNS, Program, Event } from "../model";
import { IStorage } from "./storage/storage.inteface";
import { BatchService } from "./batch.service";
import { v4 as uuidv4 } from "uuid";

export class EntitiesService {
  constructor(
    private readonly storage: IStorage,
    private readonly batchService: BatchService
  ) {}

  async saveAll() {
    await this.batchService.saveAll();
  }

  getDNS(): DNS {
    return this.storage.getDNS();
  }

  async getProgram(name: string) {
    return this.storage.getProgram(name);
  }

  async setDNS(dns: DNS) {
    await this.storage.setDNS(dns);
    this.batchService.addDnsUpdate(dns);
  }

  async setProgram(program: Program) {
    await this.storage.updateProgram(program);
    this.batchService.addProgramUpdate(program);
  }

  async addEvent(event: Omit<Event, "dns" | "id">) {
    const entity = new Event({
      ...event,
      id: uuidv4(),
      dns: this.storage.getDNS(),
    } as Event);
    this.batchService.addEvent(entity);
  }
}
