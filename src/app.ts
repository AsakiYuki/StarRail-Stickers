import { JSDOM } from "jsdom";
import fs from "fs";

const sticker_fandomPage = "https://honkai-star-rail.fandom.com/wiki/Pom-Pom_Gallery";

const saveDir = "stickers";
const { stickers } = fs.existsSync("exists.json")
    ? JSON.parse(fs.readFileSync("exists.json", "utf-8"))
    : (() => { const data = { stickers: [] }; fs.writeFileSync("exists.json", JSON.stringify(data, null, 4)); return data; })();

(async () => {
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
    const t = Date.now();

    console.log("Fetching wiki contents...");
    const fetcher = await fetch(sticker_fandomPage);

    console.log("Parsing wiki contents...");
    const html = new JSDOM(await fetcher.text());
    const document = html.window.document;
    const htmlStickers = document.querySelector('[class="article-table alternating-colors-table tdc1"]')?.querySelectorAll('[class="wikia-gallery-item"]')!;

    console.log("Finding new stickers...");
    const stickerImages = Array.from(htmlStickers, (sticker) => {
        const img = sticker.querySelector('img')!;

        const url = img.getAttribute('src')?.replace("/scale-to-width-down/60", "")!;
        const name = img.getAttribute("data-image-key")!;

        return { url, name };
    }).filter(sticker => !stickers.includes(sticker.name));

    const total = stickerImages.length;
    let count = 0;

    console.log(`Downloading ${total} stickers...`);
    await Promise.all(stickerImages.map(async ({ url, name }) => {
        const fetcher = await fetch(url);
        const stickerData = await fetcher.arrayBuffer();
        const stickerBuffer = Buffer.from(stickerData);
        const stickerPath = `${saveDir}/${name}`;
        stickers.push(name);

        await new Promise((res, reject) => {
            fs.writeFile(stickerPath, stickerBuffer, (err) => {
                if (err) reject(err);
                else res(null);
            });
        })

        console.log(`Downloaded ${++count}/${total}: ${name}`);
    }));

    await Promise.all([
        new Promise((res, reject) => fs.writeFile("exists.json", JSON.stringify({ stickers }, null, 4), (err) => { if (err) reject(err); else res(null); })),
        new Promise((res, reject) => fs.writeFile("commit", `${total ? `Updated ${total} stickers` : ""}`, (err) => { if (err) reject(err); else res(null); }))
    ]);
    console.log(`Done in ${Date.now() - t}ms`);
})()