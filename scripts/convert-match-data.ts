
import fs from 'fs';
import path from 'path';

const matchPath = path.join(process.cwd(), 'server/data/match.tsv');
const outputPath = path.join(process.cwd(), 'server/data/matchData.ts');

if (fs.existsSync(matchPath)) {
    console.log("Reading match.tsv...");
    const content = fs.readFileSync(matchPath, 'utf-8');

    console.log("Writing matchData.ts...");
    const tsContent = `export const MATCH_DATA = \`${content.replace(/`/g, '\\`')}\`;\n`;

    fs.writeFileSync(outputPath, tsContent);
    console.log("Done!");
} else {
    console.error("match.tsv not found!");
    process.exit(1);
}
