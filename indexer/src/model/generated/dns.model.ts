import {
  Entity as Entity_,
  Column as Column_,
  PrimaryColumn as PrimaryColumn_,
  OneToMany as OneToMany_,
} from "typeorm";
import { Program } from "./program.model";
import { Event } from "./event.model";

@Entity_()
export class DNS {
  constructor(props?: Partial<DNS>) {
    Object.assign(this, props);
  }

  @PrimaryColumn_()
  id!: string;

  @Column_("text", { nullable: false })
  address!: string;

  @Column_("text", { array: true, nullable: false })
  admins!: string[];

  @OneToMany_(() => Program, (e) => e.dns)
  programs!: Program[];

  @OneToMany_(() => Event, (e) => e.dns)
  events!: Event[];
}
