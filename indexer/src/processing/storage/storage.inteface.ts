import { DNS, Program } from "../../model";

export interface IStorage {
  getDNS(): DNS;
  setDNS(dns: DNS): Promise<void>;

  getProgram(program: string): Promise<Program | undefined>;
  updateProgram(program: Program): Promise<void>;
}
