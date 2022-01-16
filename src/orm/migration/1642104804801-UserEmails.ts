import { MigrationInterface, QueryRunner } from "typeorm";

export class UserEmails1642104804801 implements MigrationInterface {
    name = 'UserEmails1642104804801'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`UserEmails\` (\`id\` int NOT NULL AUTO_INCREMENT, \`email\` varchar(255) NOT NULL, \`uuid\` varchar(36) NOT NULL, \`reason\` varchar(255) NOT NULL, \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE INDEX \`IDX_713b28096da96c815cc475a190\` (\`uuid\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_713b28096da96c815cc475a190\` ON \`UserEmails\``);
        await queryRunner.query(`DROP TABLE \`UserEmails\``);
    }

}
