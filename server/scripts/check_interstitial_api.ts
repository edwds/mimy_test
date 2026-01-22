
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3001';
const USER_ID = 202; // Assuming this user exists or use one from seeds

async function checkEndpoints() {
    try {
        console.log(`Checking VS candidates for user ${USER_ID}...`);
        const vsRes = await fetch(`${API_BASE_URL}/api/vs/candidates?user_id=${USER_ID}`);
        if (!vsRes.ok) throw new Error(`VS API failed: ${vsRes.status} ${vsRes.statusText}`);
        const vsData = await vsRes.json();
        console.log('VS Candidates:', JSON.stringify(vsData, null, 2));

        console.log(`Checking Hate candidates for user ${USER_ID}...`);
        const hateRes = await fetch(`${API_BASE_URL}/api/hate/candidates?user_id=${USER_ID}`);
        if (!hateRes.ok) throw new Error(`Hate API failed: ${hateRes.status} ${hateRes.statusText}`);
        const hateData = await hateRes.json();
        console.log('Hate Candidates:', JSON.stringify(hateData, null, 2));

    } catch (error) {
        console.error('Error checking endpoints:', error);
    }
}

checkEndpoints();
