import {
  Entity as Entity_,
  Column as Column_,
  PrimaryColumn as PrimaryColumn_,
  ManyToOne as ManyToOne_,
  Index as Index_,
} from "typeorm";
import { DNS } from "./dns.model";

@Entity_()
export class Event {
  constructor(props?: Partial<Event>) {
    Object.assign(this, props);
  }

  @PrimaryColumn_()
  id!: string;

  @Column_("text", { nullable: false })
  type!: string;

  @Column_("text", { nullable: false })
  raw!: string;

  @Index_()
  @ManyToOne_(() => DNS, { nullable: true })
  dns!: DNS;

  @Column_("int4", { nullable: false })
  blockNumber!: number;

  @Column_("text", { nullable: false })
  txHash!: string;

  @Column_("timestamp with time zone", { nullable: false })
  timestamp!: Date;
}
