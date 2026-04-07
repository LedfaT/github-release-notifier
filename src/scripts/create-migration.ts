import fs from "fs";
import path from "path";

const migrationsDir = path.join(process.cwd(), "src/db/migrations");

function toSnakeCase(str: string) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/\s+/g, "_")
    .toLowerCase();
}
function main() {
  const nameArg = process.argv[2];

  if (!nameArg) {
    console.error("❌ Please provide migration name");
    process.exit(1);
  }

  const name = toSnakeCase(nameArg);
  const timestamp = new Date().getTime();

  const fileName = `${timestamp}_${name}.ts`;
  const filePath = path.join(migrationsDir, fileName);

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const template = `import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
}

export async function down(db: Kysely<any>): Promise<void> {
}
`;

  fs.writeFileSync(filePath, template);

  console.log(`✅ Migration created: ${fileName}`);
}

main();
