// @ts-nocheck
import { GearApi, decodeAddress } from "@gear-js/api";
import { TypeRegistry } from "@polkadot/types";
import { TransactionBuilder } from "sails-js";
import { u8aToHex, compactFromU8aLim } from "@polkadot/util";

const ZERO_ADDRESS = u8aToHex(new Uint8Array(32));

export type ActorId = [Array<number | string>];

export class Program {
  private registry: TypeRegistry;
  constructor(public api: GearApi, public programId?: `0x${string}`) {
    const types: Record<string, any> = {
      ActorId: "([u8; 32])",
    };

    this.registry = new TypeRegistry();
    this.registry.setKnownTypes({ types });
    this.registry.register(types);
  }

  newCtorFromCode(code: Uint8Array | Buffer): TransactionBuilder<null> {
    const builder = new TransactionBuilder<null>(
      this.api,
      this.registry,
      "upload_program",
      "New",
      "String",
      "String",
      code
    );

    this.programId = builder.programId;
    return builder;
  }

  newCtorFromCodeId(codeId: `0x${string}`) {
    const builder = new TransactionBuilder<null>(
      this.api,
      this.registry,
      "create_program",
      "New",
      "String",
      "String",
      codeId
    );

    this.programId = builder.programId;
    return builder;
  }

  public addAdmin(user: ActorId): TransactionBuilder<null> {
    return new TransactionBuilder<null>(
      this.api,
      this.registry,
      "send_message",
      ["AddAdmin", user],
      "(String, ActorId)",
      "Null",
      this.programId
    );
  }

  public addNewProgram(
    name: string,
    program_id: ActorId
  ): TransactionBuilder<null> {
    return new TransactionBuilder<null>(
      this.api,
      this.registry,
      "send_message",
      ["AddNewProgram", name, program_id],
      "(String, String, ActorId)",
      "Null",
      this.programId
    );
  }

  public changeProgramId(
    name: string,
    program_id: ActorId
  ): TransactionBuilder<null> {
    return new TransactionBuilder<null>(
      this.api,
      this.registry,
      "send_message",
      ["ChangeProgramId", name, program_id],
      "(String, String, ActorId)",
      "Null",
      this.programId
    );
  }

  public deleteAdmin(user: ActorId): TransactionBuilder<null> {
    return new TransactionBuilder<null>(
      this.api,
      this.registry,
      "send_message",
      ["DeleteAdmin", user],
      "(String, ActorId)",
      "Null",
      this.programId
    );
  }

  public async activeContracts(
    originAddress: string,
    value?: number | string | bigint,
    atBlock?: `0x${string}`
  ): Promise<Array<[string, ActorId]>> {
    const payload = this.registry
      .createType("String", "ActiveContracts")
      .toU8a();
    const reply = await this.api.message.calculateReply({
      destination: this.programId,
      origin: decodeAddress(originAddress),
      payload,
      value: value || 0,
      gasLimit: this.api.blockGasLimit.toBigInt(),
      at: atBlock || null,
    });
    const result = this.registry.createType(
      "(String, Vec<(String, ActorId)>)",
      reply.payload
    );
    return result[1].toJSON() as unknown as Array<[string, ActorId]>;
  }

  public async admins(
    originAddress: string,
    value?: number | string | bigint,
    atBlock?: `0x${string}`
  ): Promise<Array<ActorId>> {
    const payload = this.registry.createType("String", "Admins").toU8a();
    const reply = await this.api.message.calculateReply({
      destination: this.programId,
      origin: decodeAddress(originAddress),
      payload,
      value: value || 0,
      gasLimit: this.api.blockGasLimit.toBigInt(),
      at: atBlock || null,
    });
    const result = this.registry.createType(
      "(String, Vec<ActorId>)",
      reply.payload
    );
    return result[1].toJSON() as unknown as Array<ActorId>;
  }

  public async history(
    originAddress: string,
    value?: number | string | bigint,
    atBlock?: `0x${string}`
  ): Promise<Array<[string, Array<[string, ActorId]>]>> {
    const payload = this.registry.createType("String", "History").toU8a();
    const reply = await this.api.message.calculateReply({
      destination: this.programId,
      origin: decodeAddress(originAddress),
      payload,
      value: value || 0,
      gasLimit: this.api.blockGasLimit.toBigInt(),
      at: atBlock || null,
    });
    const result = this.registry.createType(
      "(String, Vec<(String, Vec<(String, ActorId)>)>)",
      reply.payload
    );
    return result[1].toJSON() as unknown as Array<
      [string, Array<[string, ActorId]>]
    >;
  }

  public subscribeToAdminAddedEvent(
    callback: (data: { new_admin: ActorId }) => void | Promise<void>
  ): Promise<() => void> {
    return this.api.gearEvents.subscribeToGearEvent(
      "UserMessageSent",
      ({ data: { message } }) => {
        if (
          !message.source.eq(this.programId) ||
          !message.destination.eq(ZERO_ADDRESS)
        ) {
          return;
        }

        const payload = message.payload.toU8a();
        const [offset, limit] = compactFromU8aLim(payload);
        const name = this.registry
          .createType("String", payload.subarray(offset, limit))
          .toString();
        if (name === "AdminAdded") {
          callback(
            this.registry
              .createType(
                '(String, {"new_admin":"ActorId"})',
                message.payload
              )[1]
              .toJSON() as { new_admin: ActorId }
          );
        }
      }
    );
  }

  public subscribeToAdminDeletedEvent(
    callback: (data: { deleted_admin: ActorId }) => void | Promise<void>
  ): Promise<() => void> {
    return this.api.gearEvents.subscribeToGearEvent(
      "UserMessageSent",
      ({ data: { message } }) => {
        if (
          !message.source.eq(this.programId) ||
          !message.destination.eq(ZERO_ADDRESS)
        ) {
          return;
        }

        const payload = message.payload.toU8a();
        const [offset, limit] = compactFromU8aLim(payload);
        const name = this.registry
          .createType("String", payload.subarray(offset, limit))
          .toString();
        if (name === "AdminDeleted") {
          callback(
            this.registry
              .createType(
                '(String, {"deleted_admin":"ActorId"})',
                message.payload
              )[1]
              .toJSON() as { deleted_admin: ActorId }
          );
        }
      }
    );
  }

  public subscribeToNewProgramAddedEvent(
    callback: (data: {
      name: string;
      program_id: ActorId;
    }) => void | Promise<void>
  ): Promise<() => void> {
    return this.api.gearEvents.subscribeToGearEvent(
      "UserMessageSent",
      ({ data: { message } }) => {
        if (
          !message.source.eq(this.programId) ||
          !message.destination.eq(ZERO_ADDRESS)
        ) {
          return;
        }

        const payload = message.payload.toU8a();
        const [offset, limit] = compactFromU8aLim(payload);
        const name = this.registry
          .createType("String", payload.subarray(offset, limit))
          .toString();
        if (name === "NewProgramAdded") {
          callback(
            this.registry
              .createType(
                '(String, {"name":"String","program_id":"ActorId"})',
                message.payload
              )[1]
              .toJSON() as { name: string; program_id: ActorId }
          );
        }
      }
    );
  }

  public subscribeToProgramIdChangedEvent(
    callback: (data: {
      name: string;
      program_id: ActorId;
      date: string;
    }) => void | Promise<void>
  ): Promise<() => void> {
    return this.api.gearEvents.subscribeToGearEvent(
      "UserMessageSent",
      ({ data: { message } }) => {
        if (
          !message.source.eq(this.programId) ||
          !message.destination.eq(ZERO_ADDRESS)
        ) {
          return;
        }

        const payload = message.payload.toU8a();
        const [offset, limit] = compactFromU8aLim(payload);
        const name = this.registry
          .createType("String", payload.subarray(offset, limit))
          .toString();
        if (name === "ProgramIdChanged") {
          callback(
            this.registry
              .createType(
                '(String, {"name":"String","program_id":"ActorId","date":"String"})',
                message.payload
              )[1]
              .toJSON() as { name: string; program_id: ActorId; date: string }
          );
        }
      }
    );
  }
}
