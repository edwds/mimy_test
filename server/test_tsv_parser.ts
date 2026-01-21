
// Mock of the parser logic we just added to admin.ts to verify it correctness in isolation
const parseTSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (inQuote) {
            if (char === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++;
                } else {
                    // End of quote
                    inQuote = false;
                }
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuote = true;
            } else if (char === '\t') {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
    }
    result.push(current);
    return result;
};

const line = `1\t103\tthechefinzelkova\t더쉐프인젤코바\tdesc\taddr\tregion\t"{""ko"":""더쉐프인젤코바""}"\t"{""ko"":""desc""}"\t"{""ko"":""addr""}"`;
const parsed = parseTSVLine(line);

console.log("Parsed name_i18n:", parsed[7]);

if (parsed[7] === '{"ko":"더쉐프인젤코바"}') {
    console.log("SUCCESS: Parsed correctly");
    process.exit(0);
} else {
    console.error("FAILURE: Parsed incorrectly");
    console.log("Expected:", '{"ko":"더쉐프인젤코바"}');
    console.log("Actual:  ", parsed[7]);
    process.exit(1);
}
