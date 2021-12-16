import { Field, Int, ObjectType } from "type-graphql";
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * use the BaseEntity (from TypeORM) to do .save() etc...
 * (Active Record Pattern)
 * @ObjectType makes this type available to GraphQL
 * @Field tells GraphQL which fields is allowed to query for. Notice that the password is left out
 */
@ObjectType()
@Entity("UserEmailConfirmations") // tablename specified
export class UserEmailConfirmation extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  email: string;

  @Field()
  @Column("varchar", { unique: true, length: 36 })
  uuid: string;

  @Field()
  @Column({
    nullable: false,
    type: "timestamp",
    default: () => "DATE_ADD(NOW())",
  })
  createdAt: Date;
}
