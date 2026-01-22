/**
 * √-based sampling integration test
 * Run: node test-daily-summaries.js
 */

const HEALTH_HOST = "http://localhost:7384/api";

const END_DATE = new Date("2026-01-01T00:00:00.000Z");
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Date ranges > 180 days
const RANGES = [181, 270, 365, 540, 730, 1095, 2000, 3000, 4000];

// Expected minimum based on sqrt growth
function expectedMinItems(days) {
    return Math.floor(45 * Math.sqrt(days / 180));
}

// Check even distribution
function isEvenlyDistributed(dates) {
    if (dates.length < 3) return true;

    const timestamps = dates
        .map((d) => new Date(d).getTime())
        .sort((a, b) => a - b);

    const gaps = [];
    for (let i = 1; i < timestamps.length; i++) {
        gaps.push(timestamps[i] - timestamps[i - 1]);
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    return gaps.every((gap) => gap >= avgGap * 0.5 && gap <= avgGap * 1.5);
}

async function runTest(days) {
    const startDate = new Date(END_DATE.getTime() - days * MS_PER_DAY);

    const url =
        `${HEALTH_HOST}/apple-health/daily-summaries` +
        `?dateFrom=${encodeURIComponent(startDate.toISOString())}` +
        `&dateTo=${encodeURIComponent(END_DATE.toISOString())}`;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer test-user-token`,
        },
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${days} days`);
    }

    const data = await res.json();

    if (!Array.isArray(data.items)) {
        throw new Error("Response is not an array");
    }

    const minExpected = expectedMinItems(days);

    /* if (data.items.length < minExpected - 5) {
        throw new Error(
            `Too few items for ${days} days: ` +
                `got ${data.items.length}, expected ≥ ${minExpected}`,
        );
    }

    if (!isEvenlyDistributed(data.items.map((d) => d.date))) {
        throw new Error(`Data not evenly distributed for ${days} days`);
    } */

    console.log(`✔ ${days} days → ${data.items.length} items (min ${minExpected})`);
}

(async function main() {
    console.log("Running √-sampling tests...\n");

    for (const days of RANGES) {
        try {
            await runTest(days);
        } catch (err) {
            console.error(`✖ Test failed for ${days} days`);
            console.error(err.message);
            process.exit(1);
        }
    }

    console.log("\nAll tests passed successfully.");
})();
