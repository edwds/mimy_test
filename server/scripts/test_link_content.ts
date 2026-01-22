
import { db } from "../db/index.js";
import { content } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

async function testLinkJson() {
    console.log("Testing link_json creation...");

    try {
        // 1. Create a mock content with link_json
        const mockLink = [{ title: "Test Link", url: "https://example.com" }];

        const result = await db.insert(content).values({
            user_id: 202, // Assuming a valid user ID (from seeds) or use one known to exist
            type: 'post',
            text: 'Test content with link',
            link_json: mockLink,
            visibility: true
        }).returning();

        console.log("Insert Result:", JSON.stringify(result[0], null, 2));

        if (!result[0].link_json) {
            console.error("FAIL: link_json is null or undefined in returned result");
        } else {
            console.log("SUCCESS: link_json saved:", result[0].link_json);
        }

        // 2. Fetch it back to be sure
        const fetched = await db.select().from(content).where(eq(content.id, result[0].id));
        console.log("Fetched Result:", JSON.stringify(fetched[0].link_json, null, 2));

    } catch (error) {
        console.error("Error:", error);
    }
}

testLinkJson();
