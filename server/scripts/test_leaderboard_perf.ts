
import axios from 'axios';

async function testLeaderboard() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
        console.log("Testing Leaderboard API...");
        const start = Date.now();
        const res = await axios.get('http://localhost:3001/api/users/leaderboard?filter=neighborhood');
        const end = Date.now();

        console.log(`Response Time: ${end - start}ms`);
        console.log(`Results: ${res.data.length} users`);
        if (res.data.length > 0) {
            console.log("Top User:", res.data[0]);
        }
    } catch (e: any) {
        console.error("Error:", e.message);
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Data:", e.response.data);
        }
    }
}
testLeaderboard();
