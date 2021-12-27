import { Field, Int, ObjectType, Root } from "type-graphql";
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * use the BaseEntity (from TypeORM) to do .save() etc...
 * (Active Record Pattern)
 * @ObjectType makes this type available to GraphQL
 * @Field tells GraphQL which fields is allowed to query for. Notice that the password is left out
 */
@ObjectType()
@Entity("Users") // tablename specified
export class User extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  firstName: string;

  @Field()
  @Column()
  lastName: string;

  @Field()
  @Column()
  email: string;

  // GraphQL schema column - not stored in database
  //   https://typegraphql.com/docs/resolvers.html
  // Recommended: simple types put directly in here
  // more complex async Fileds, put them in the Resolver
  @Field()
  name(@Root() parent: User): string {
    return `${parent.firstName} ${parent.lastName}`;
  }

  @Column()
  password: string;

  @Column("bool", { default: false })
  confirmed: boolean;

  @Column("int", { default: 0 })
  tokenVersion: number;
}
