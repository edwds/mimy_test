
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

        // 3. Verify Get Link (First Request - Cache MISS)
        console.log(`Fetching shared link ${code} (1st attempt)...`);
        const start1 = performance.now();
        const getRes1 = await fetch(`${API_URL}/${code}`);
        const end1 = performance.now();

        if (!getRes1.ok) {
            console.error("Failed to fetch link 1:", await getRes1.text());
            return;
        }

        const getData1 = await getRes1.json();
        console.log(`1st Fetch took: ${(end1 - start1).toFixed(2)}ms`);
        console.log("Items Count:", getData1.items.length);

        // 4. Verify Get Link (Second Request - Cache HIT)
        console.log(`Fetching shared link ${code} (2nd attempt)...`);
        const start2 = performance.now();
        const getRes2 = await fetch(`${API_URL}/${code}`);
        const end2 = performance.now();

        if (!getRes2.ok) {
            console.error("Failed to fetch link 2:", await getRes2.text());
            return;
        }

        const getData2 = await getRes2.json();
        console.log(`2nd Fetch took: ${(end2 - start2).toFixed(2)}ms`); // Should be much faster

        if ((end2 - start2) < (end1 - start1)) {
            console.log("✅ Caching seems to be working (2nd request was faster).");
        } else {
            console.log("⚠️ 2nd request was not faster. Redis might not be working or overhead is high.");
        }

    } catch (error) {
        console.error("Verification failed:", error);
    }
}

verify();
