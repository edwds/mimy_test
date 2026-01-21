
import fetch from 'node-fetch';

async function testImport() {
    const url = 'http://localhost:3001/api/shops/import-google';

    // Payload mimicking what search/google returns and what SearchShopStep passes
    const payload = {
        google_place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4", // Example Google Place ID
        name: "Google Australia",
        formatted_address: "48 Pirrama Rd, Pyrmont NSW 2009, Australia",
        location: {
            lat: -33.866651,
            lng: 151.195827
        },
        rating: 4.5,
        user_ratings_total: 100,
        thumbnail_img: "https://maps.googleapis.com/...",
        food_kind: "office",
        description: "Google's Sydney office.",
        photos: []
    };

    console.log('Sending payload:', JSON.stringify(payload, null, 2));

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Response:', text);
    } catch (e) {
        console.error('Request failed:', e);
    }
}

testImport();
