
import { LeaderboardService } from '../services/LeaderboardService.js';

async function main() {
    try {
        await LeaderboardService.refresh();
        console.log("Done.");
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

main();
