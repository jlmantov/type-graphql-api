import { MigrationInterface, QueryRunner } from "typeorm";

export class newfile1642104786309 implements MigrationInterface {
  name = "newfile1642104786309";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE `Users` (" +
        "`id` int NOT NULL AUTO_INCREMENT, " +
        "`firstName` varchar(255) NOT NULL, " +
        "`lastName` varchar(255) NOT NULL, " +
        "`email` varchar(255) NOT NULL, " +
        "`password` varchar(255) NOT NULL, " +
        "`confirmed` tinyint NOT NULL DEFAULT 0, " +
        "`tokenVersion` int NOT NULL DEFAULT '0', " +
        "PRIMARY KEY (`id`)) " +
        "ENGINE=InnoDB"
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`Users\``);
  }
}
