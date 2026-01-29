import { db } from '../db/index.js';
import { users, content, users_ranking } from '../db/schema.js';
import { eq, and, desc, asc, like, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ContentRow {
  id: number;
  user_id: number;
  type: string;
  img: string;
  video: string;
  text: string;
  review_prop: string;
  keyword: string;
  visibility: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

interface ParsedContent {
  type: string;
  img: any;
  video: any;
  text: string;
  review_prop: any;
  keyword: any;
  visibility: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

interface RankingEntry {
  user_id: number;
  shop_id: number;
  visit_date: Date;
  satisfaction_tier: number;
}

// Parse TSV line
function parseTsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === '\t' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

// Parse JSON safely
function parseJsonField(field: string): any {
  if (!field || field === '[]' || field === '{}') {
    return field === '[]' ? [] : null;
  }
  try {
    return JSON.parse(field);
  } catch (e) {
    console.error('JSON parse error:', field.substring(0, 100));
    return null;
  }
}

// Convert satisfaction string to tier number
function satisfactionToTier(satisfaction: string): number {
  switch (satisfaction) {
    case 'good': return 2;
    case 'ok': return 1;
    case 'bad': return 0;
    default: return 1;
  }
}

async function main() {
  console.log('Starting content distribution...');

  // 1. Get dummy users (emails ending with sample.com)
  const dummyUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(sql`${users.email} LIKE '%sample.com'`)
    .execute();

  console.log(`Found ${dummyUsers.length} dummy users with sample.com email`);

  if (dummyUsers.length === 0) {
    console.error('No dummy users found! Looking for users with email ending in sample.com');
    process.exit(1);
  }

  // 2. Read TSV file
  const tsvPath = path.join(__dirname, '../data/content_mock_dump.tsv');
  const fileContent = fs.readFileSync(tsvPath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());

  console.log(`Read ${lines.length} lines from TSV file`);

  // Skip header
  const dataLines = lines.slice(1);

  // 3. Parse and distribute content
  const parsedContents: Array<{ userId: number; content: ParsedContent }> = [];
  const rankingData: Map<number, RankingEntry[]> = new Map();

  console.log('Parsing TSV data...');

  for (let i = 0; i < dataLines.length; i++) {
    if (i % 10000 === 0) {
      console.log(`Processing line ${i + 1}/${dataLines.length}`);
    }

    const line = dataLines[i];
    if (!line.trim()) continue;

    try {
      const fields = parseTsvLine(line);

      if (fields.length < 12) {
        console.warn(`Skipping line ${i + 2}: insufficient fields`);
        continue;
      }

      // Randomly assign to a dummy user
      const randomUser = dummyUsers[Math.floor(Math.random() * dummyUsers.length)];

      const parsedContent: ParsedContent = {
        type: fields[2],
        img: parseJsonField(fields[3]),
        video: parseJsonField(fields[4]),
        text: fields[5],
        review_prop: parseJsonField(fields[6]),
        keyword: parseJsonField(fields[7]),
        visibility: fields[8] === 'true',
        is_deleted: fields[9] === 'true',  // Fixed: was === 'false'
        created_at: new Date(fields[10]),
        updated_at: new Date(fields[11])
      };

      parsedContents.push({
        userId: randomUser.id,
        content: parsedContent
      });

      // If it's a review, collect ranking data
      if (parsedContent.type === 'review' && parsedContent.review_prop) {
        const { shop_id, visit_date, satisfaction } = parsedContent.review_prop;

        if (shop_id && visit_date && satisfaction) {
          if (!rankingData.has(randomUser.id)) {
            rankingData.set(randomUser.id, []);
          }

          rankingData.get(randomUser.id)!.push({
            user_id: randomUser.id,
            shop_id: shop_id,
            visit_date: new Date(visit_date),
            satisfaction_tier: satisfactionToTier(satisfaction)
          });
        }
      }
    } catch (error) {
      console.error(`Error parsing line ${i + 2}:`, error);
    }
  }

  console.log(`Parsed ${parsedContents.length} content entries`);
  console.log(`Collected ranking data for ${rankingData.size} users`);

  // 4. Insert content in batches
  console.log('Inserting content into database...');
  const batchSize = 1000;

  for (let i = 0; i < parsedContents.length; i += batchSize) {
    const batch = parsedContents.slice(i, i + batchSize);

    try {
      await db.insert(content).values(
        batch.map(({ userId, content: c }) => ({
          user_id: userId,
          type: c.type,
          img: c.img,
          video: c.video,
          text: c.text,
          review_prop: c.review_prop,
          keyword: c.keyword,
          visibility: c.visibility,
          is_deleted: c.is_deleted,
          created_at: c.created_at,
          updated_at: c.updated_at
        }))
      );

      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(parsedContents.length / batchSize)}`);
    } catch (error) {
      console.error(`Error inserting batch at index ${i}:`, error);
    }
  }

  // 5. Generate and insert rankings for each user
  console.log('Generating rankings...');

  const allRankings: Array<{
    user_id: number;
    shop_id: number;
    rank: number;
    satisfaction_tier: number;
  }> = [];

  let processedUsers = 0;
  const totalUsers = rankingData.size;

  for (const [userId, entries] of rankingData.entries()) {
    processedUsers++;

    if (processedUsers % 100 === 0) {
      console.log(`Processing rankings for user ${processedUsers}/${totalUsers}...`);
    }

    // Remove duplicates - keep only the most recent visit per shop
    const shopMap = new Map<number, RankingEntry>();

    for (const entry of entries) {
      const existingEntry = shopMap.get(entry.shop_id);

      if (!existingEntry || entry.visit_date > existingEntry.visit_date) {
        shopMap.set(entry.shop_id, entry);
      }
    }

    // Convert back to array
    const uniqueEntries = Array.from(shopMap.values());

    // Group by satisfaction tier
    const tierGroups = {
      2: [] as RankingEntry[],  // good
      1: [] as RankingEntry[],  // ok
      0: [] as RankingEntry[]   // bad
    };

    for (const entry of uniqueEntries) {
      tierGroups[entry.satisfaction_tier as keyof typeof tierGroups].push(entry);
    }

    // Sort each tier by visit_date (most recent first = rank 1)
    for (const tier of [2, 1, 0]) {
      const tierEntries = tierGroups[tier as keyof typeof tierGroups];

      // Sort by visit_date descending (most recent first)
      tierEntries.sort((a, b) => b.visit_date.getTime() - a.visit_date.getTime());

      // Assign ranks within tier
      tierEntries.forEach((entry, index) => {
        allRankings.push({
          user_id: entry.user_id,
          shop_id: entry.shop_id,
          rank: index + 1,
          satisfaction_tier: tier
        });
      });
    }
  }

  console.log(`Generated ${allRankings.length} total ranking entries`);

  // Insert all rankings in batches
  console.log('Inserting rankings into database...');
  const rankingBatchSize = 5000;

  for (let i = 0; i < allRankings.length; i += rankingBatchSize) {
    const batch = allRankings.slice(i, i + rankingBatchSize);

    try {
      await db.insert(users_ranking).values(batch);
      console.log(`Inserted ranking batch ${Math.floor(i / rankingBatchSize) + 1}/${Math.ceil(allRankings.length / rankingBatchSize)} (${batch.length} entries)`);
    } catch (error) {
      console.error(`Error inserting ranking batch at index ${i}:`, error);
    }
  }

  console.log('Content distribution complete!');
  console.log(`Total content entries: ${parsedContents.length}`);
  console.log(`Total users with rankings: ${rankingData.size}`);
}

main()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
