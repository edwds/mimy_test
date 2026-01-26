
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

async function verify() {
    try {
        // 1. Get a user
        const user = await db.select().from(users).limit(1);
        if (user.length === 0) {
            console.error("No users found to test with.");
            return;
        }
        const userId = user[0].id;
        console.log(`Testing with User ID: ${userId}`);

        // 2. Mock Request to create share link
        // We will mock the fetch call by invoking the logic or just using fetch if server is running.
        // Since we can't easily fetch localhost from here without a running server known port (it is 3001 but maybe safer to use DB directly or invoke handler), 
        // actually we can use fetch if we assume standard port.
        const API_URL = "http://localhost:3001/api/share";

        console.log("Creating share link...");
        const createRes = await fetch(`${API_URL}/list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                type: 'OVERALL',
                value: '',
                title: 'Test Ranking'
            })
        });

        if (!createRes.ok) {
            console.error("Failed to create link:", await createRes.text());
            return;
        }

        const createData = await createRes.json();
        console.log("Link Created:", createData);

        const { code } = createData;

        // 3. Verify Get Link
        console.log(`Fetching shared link ${code}...`);
        const getRes = await fetch(`${API_URL}/${code}`);

        if (!getRes.ok) {
            console.error("Failed to fetch link:", await getRes.text());
            return;
        }

        const getData = await getRes.json();
        console.log("Link Fetched Successfully!");
        console.log("Title:", getData.title);
        console.log("Author:", getData.author.nickname);
        console.log("Items Count:", getData.items.length);

    } catch (error) {
        console.error("Verification failed:", error);
    }
}

verify();
