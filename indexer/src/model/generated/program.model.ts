import {
  Entity as Entity_,
  Column as Column_,
  PrimaryColumn as PrimaryColumn_,
  ManyToOne as ManyToOne_,
  Index as Index_,
} from "typeorm";
import { DNS } from "./dns.model";

@Entity_()
export class Program {
  constructor(props?: Partial<Program>) {
    Object.assign(this, props);
  }

  /**
   * Program address
   */
  @PrimaryColumn_()
  id!: string;

  @Column_("text", { nullable: false })
  name!: string;

  @Column_("text", { nullable: false })
  address!: string;

  @Index_()
  @ManyToOne_(() => DNS, { nullable: true })
  dns!: DNS;

  @Column_("text", { nullable: false })
  createdBy!: string;

  @Column_("text", { nullable: false })
  history!: string;

  @Index_()
  @Column_("timestamp with time zone", { nullable: false })
  createdAt!: Date;

  @Index_()
  @Column_("timestamp with time zone", { nullable: false })
  updatedAt!: Date;
}
