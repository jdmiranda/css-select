import { parseDocument } from "htmlparser2";
import { compile, selectAll, selectOne } from "./dist/esm/index.js";

// Benchmark utilities
function benchmark(name, fn, iterations = 10000) {
    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
        fn();
    }
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    const opsPerSec = Math.round((iterations / durationMs) * 1000);
    console.log(
        `${name}: ${opsPerSec.toLocaleString()} ops/sec (${durationMs.toFixed(2)}ms for ${iterations} iterations)`,
    );
    return opsPerSec;
}

// Create test DOM structures of varying complexity
function createSmallDOM() {
    return parseDocument(`
        <html>
            <body>
                <div id="main" class="container">
                    <h1>Title</h1>
                    <p class="text">Paragraph 1</p>
                    <p class="text">Paragraph 2</p>
                    <span id="highlight">Important</span>
                </div>
            </body>
        </html>
    `);
}

function createMediumDOM() {
    let html = "<html><body>";
    for (let i = 0; i < 50; i++) {
        html += `
            <div id="div${i}" class="section">
                <h2 class="heading">Section ${i}</h2>
                <p class="text">Content for section ${i}</p>
                <ul class="list">
                    <li class="item">Item 1</li>
                    <li class="item">Item 2</li>
                    <li class="item">Item 3</li>
                </ul>
            </div>
        `;
    }
    html += "</body></html>";
    return parseDocument(html);
}

function createLargeDOM() {
    let html = "<html><body>";
    for (let i = 0; i < 200; i++) {
        html += `
            <div id="div${i}" class="section level1">
                <h2 class="heading">Section ${i}</h2>
                <div class="subsection">
                    <p class="text">Content ${i}</p>
                    <ul class="list">
                        <li class="item" data-index="${i}-1">Item 1</li>
                        <li class="item" data-index="${i}-2">Item 2</li>
                        <li class="item active" data-index="${i}-3">Item 3</li>
                    </ul>
                </div>
            </div>
        `;
    }
    html += "</body></html>";
    return parseDocument(html);
}

console.log("\n=== CSS-SELECT PERFORMANCE BENCHMARK ===\n");

// Test 1: Compilation Performance
console.log("--- COMPILATION PERFORMANCE ---");
const selectors = [
    "div",
    ".container",
    "#main",
    "div.section",
    "div > p",
    "div p.text",
    "ul li.item",
    "div.section > h2.heading",
    "[data-index]",
    'div[id^="div"]',
];

for (const selector of selectors) {
    benchmark(`Compile: "${selector}"`, () => compile(selector), 50000);
}

console.log("\n--- SELECTION PERFORMANCE (Small DOM) ---");
const smallDOM = createSmallDOM();
benchmark('Select: "div"', () => selectAll("div", smallDOM), 100000);
benchmark('Select: ".text"', () => selectAll(".text", smallDOM), 100000);
benchmark('Select: "#main"', () => selectAll("#main", smallDOM), 100000);
benchmark('Select: "p.text"', () => selectAll("p.text", smallDOM), 50000);
benchmark('Select: "div > p"', () => selectAll("div > p", smallDOM), 50000);

console.log("\n--- SELECTION PERFORMANCE (Medium DOM) ---");
const mediumDOM = createMediumDOM();
benchmark('Select: "div"', () => selectAll("div", mediumDOM), 10000);
benchmark('Select: ".section"', () => selectAll(".section", mediumDOM), 10000);
benchmark('Select: ".item"', () => selectAll(".item", mediumDOM), 10000);
benchmark(
    'Select: "div.section"',
    () => selectAll("div.section", mediumDOM),
    5000,
);
benchmark(
    'Select: "ul li.item"',
    () => selectAll("ul li.item", mediumDOM),
    5000,
);

console.log("\n--- SELECTION PERFORMANCE (Large DOM) ---");
const largeDOM = createLargeDOM();
benchmark('Select: "div"', () => selectAll("div", largeDOM), 1000);
benchmark('Select: ".section"', () => selectAll(".section", largeDOM), 1000);
benchmark('Select: "#div100"', () => selectAll("#div100", largeDOM), 5000);
benchmark(
    'Select: "[data-index]"',
    () => selectAll("[data-index]", largeDOM),
    1000,
);
benchmark(
    'Select: ".item.active"',
    () => selectAll(".item.active", largeDOM),
    1000,
);

console.log("\n--- COMPILED QUERY REUSE (Large DOM) ---");
const compiledDiv = compile("div");
const compiledClass = compile(".section");
const compiledComplex = compile("div.section > h2.heading");

benchmark(
    'Reuse compiled: "div"',
    () => selectAll(compiledDiv, largeDOM),
    5000,
);
benchmark(
    'Reuse compiled: ".section"',
    () => selectAll(compiledClass, largeDOM),
    5000,
);
benchmark(
    "Reuse compiled: complex",
    () => selectAll(compiledComplex, largeDOM),
    5000,
);

console.log("\n--- SELECTONE PERFORMANCE ---");
benchmark('SelectOne: "div"', () => selectOne("div", largeDOM), 10000);
benchmark('SelectOne: "#div100"', () => selectOne("#div100", largeDOM), 10000);
benchmark('SelectOne: ".item"', () => selectOne(".item", largeDOM), 10000);

console.log("\n--- ATTRIBUTE SELECTOR PERFORMANCE ---");
benchmark(
    'Select: "[data-index]"',
    () => selectAll("[data-index]", largeDOM),
    1000,
);
benchmark(
    'Select: "[data-index^=\\"100\\"]"',
    () => selectAll('[data-index^="100"]', largeDOM),
    1000,
);
benchmark(
    'Select: "[class*=\\"section\\"]"',
    () => selectAll('[class*="section"]', largeDOM),
    1000,
);

console.log("\n--- PSEUDO-SELECTOR PERFORMANCE ---");
benchmark(
    'Select: "li:first-child"',
    () => selectAll("li:first-child", largeDOM),
    1000,
);
benchmark(
    'Select: "li:last-child"',
    () => selectAll("li:last-child", largeDOM),
    1000,
);
benchmark(
    'Select: "div:not(.active)"',
    () => selectAll("div:not(.active)", largeDOM),
    1000,
);

console.log("\n=== BENCHMARK COMPLETE ===\n");
