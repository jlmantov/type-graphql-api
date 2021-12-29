import { Field, Int, ObjectType } from "type-graphql";
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * use the BaseEntity (from TypeORM) to do .save() etc...
 * (Active Record Pattern)
 * @ObjectType makes this type available to GraphQL - https://typegraphql.com/docs/extensions.html#using-the-extensions-decorator
 * @Field tells GraphQL which fields is allowed to query for. Notice that the password is left out
 */
@ObjectType()
@Entity("UserEmails") // tablename specified
export class UserEmail extends BaseEntity {
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
  @Column("varchar")
  reason: string;

  @Field()
  @Column({
    nullable: false,
    type: "timestamp",
    default: () => "DATE_ADD(NOW())",
  })
  createdAt: Date;
}
