import { Store } from "@subsquid/typeorm-store";
import { IStorage } from "./storage.inteface";
import { DNS, Program } from "../../model";

let storage: LocalStorage | undefined;

export async function getLocalStorage(store: Store): Promise<LocalStorage> {
  if (storage === undefined) {
    storage = new LocalStorage(store);
    await storage.waitInit();
  }
  storage.setStore(store);
  return storage;
}

export class LocalStorage implements IStorage {
  private initialized = false;
  private dns: DNS | undefined;
  // name -> Program
  private programs: Record<string, Program> = {};

  constructor(private store: Store) {}

  async waitInit() {
    if (this.initialized) {
      return;
    }
    await this.loadEntities();
    this.initialized = true;
  }

  getDNS(): DNS {
    return this.dns!;
  }

  async setDNS(dns: DNS) {
    this.dns = dns;
  }

  setStore(store: Store) {
    this.store = store;
    this.programs = {};
  }

  async getProgram(program: string): Promise<Program | undefined> {
    if (this.programs[program] !== undefined) {
      return this.programs[program];
    }
    return this.store.findOne(Program, { where: { id: program } });
  }

  async updateProgram(program: Program): Promise<void> {
    this.programs[program.id] = program;
  }

  private async loadEntities() {
    await Promise.all([this.loadDns()]);
  }

  private async loadDns() {
    this.dns = await this.store.findOne(DNS, { where: {} });
    if (!this.dns) {
      throw new Error("DNS not found");
    }
  }
}
