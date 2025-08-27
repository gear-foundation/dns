import { Store } from "@subsquid/typeorm-store";
import { DNS, Program, Event } from "../model";

export class BatchService {
  private dns: DNS[] = [];
  private programs: Program[] = [];
  private programsToDelete: Program[] = [];
  private events: Event[] = [];

  constructor(private readonly store: Store) {}

  async saveAll() {
    await this.store.save(this.dns);
    if (this.programsToDelete.length) {
      await this.store.remove(this.programsToDelete);
    }
    await Promise.all([
      this.store.save(this.programs),
      this.store.save(this.events),
    ]);
    this.clearAll();
  }

  clearAll() {
    this.programs = [];
    this.events = [];
    this.programsToDelete = [];
  }

  addProgramUpdate(program: Program) {
    this.safelyPush("programs", program);
  }

  addDnsUpdate(dns: DNS) {
    this.dns = [dns];
  }

  addEvent(event: Event) {
    this.safelyPush("events", event);
  }

  private safelyPush(entity: string, value: any) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const array = this[entity] as any[];
    const existingIndex = array.findIndex((e) => e.id === value.id);
    if (existingIndex >= 0) {
      array[existingIndex] = value; // Заменяем существующий элемент
    } else {
      array.push(value); // Добавляем новый элемент
    }
  }

  deleteProgram(program: Program) {
    this.programsToDelete.push(program);
  }
}
