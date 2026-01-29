import { db } from '../db';
import { users } from '../db/schema';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Checking for dummy users with sample.com email...');

  const dummyUsers = await db
    .select({
      id: users.id,
      email: users.email,
      nickname: users.nickname,
      account_id: users.account_id
    })
    .from(users)
    .where(sql`${users.email} LIKE '%sample.com'`)
    .execute();

  console.log(`\nFound ${dummyUsers.length} dummy users:\n`);

  dummyUsers.forEach((user, index) => {
    console.log(`${index + 1}. ID: ${user.id}, Email: ${user.email}, Nickname: ${user.nickname}, Account: ${user.account_id}`);
  });

  if (dummyUsers.length === 0) {
    console.log('\nNo dummy users found!');
    console.log('Please create dummy users with emails ending in "sample.com" before running the distribution script.');
  } else {
    console.log(`\nReady to distribute content to these ${dummyUsers.length} users.`);
    console.log('Run: npm run distribute-content');
  }
}

main()
  .then(() => {
    console.log('\nCheck complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Check failed:', error);
    process.exit(1);
  });
