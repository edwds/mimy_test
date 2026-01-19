
import { db } from '../db/index';
import { shops } from '../db/schema';

async function main() {
    console.log("Attempting to insert a mock Google Shop...");
    try {
        const mockPlaceId = "ChIJ" + Math.random().toString(36).substring(7);
        const values = {
            name: "Test Shop " + Math.random(),
            google_place_id: mockPlaceId,
            address_full: "123 Test St",
            address_region: "Test City",
            lat: 37.5665,
            lon: 126.9780,
            thumbnail_img: null,
            status: 2,
            country_code: 'KR',
            visibility: true
        };
        console.log("Values:", values);

        const newShopId = await db.insert(shops).values(values).returning({ id: shops.id });
        console.log("Success! New ID:", newShopId);
    } catch (error) {
        console.error("Error inserting mock shop:", error);
    }
    process.exit(0);
}

main();
