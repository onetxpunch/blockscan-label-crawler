import { writeFile } from "fs/promises";
import puppeteer from "puppeteer-extra";
import Stealth from "puppeteer-extra-plugin-stealth";
import cheerio from "cheerio";

puppeteer.use(Stealth());
const browser = await puppeteer.launch({ headless: false });

const explorers = async () => {
	const url = "https://blockscan.com/";
	const response = await fetch(url);
	const html = await response.text();
	const $ = cheerio.load(html);
	const urls: string[] = [];

	$("a.product-list").each((_, element) => {
		const href = $(element).attr("href");
		if (href) {
			urls.push(`${href}`);
		}
	});

	console.log(urls);

	return urls;
};

const getLabels = async (explorerUrl) => {
	const url = "https:" + explorerUrl + "/labelcloud";
	const response = await fetch(url);
	const html = await response.text();
	const $ = cheerio.load(html);

	const urls: string[] = [];

	$("a[href^='/accounts/label']").each((_, element) => {
		const href = $(element).attr("href");
		if (href) {
			urls.push("https:" + explorerUrl + href);
		}
	});

	return urls;
};

const getTables = async (url) => {
	const page = await browser.newPage();
	await page.goto(url, { waitUntil: "networkidle0" });
	await page.waitForTimeout(8000);

	const labels = await page.$$eval("table > tbody > tr", (rows) => {
		return rows.map((row) => {
			if (!row) return ["ab", "cd"];
			const firstTdHref = row
				.querySelector("td:nth-child(1) a")
				?.getAttribute("href");

			const secondTdText = row
				.querySelector("td:nth-child(2)")
				?.textContent?.trim();
			return [
				`0x${firstTdHref?.split("x")[1]}`.toLowerCase(),
				secondTdText,
			];
		});
	});
	console.log(labels);

	await page?.close();
	return labels;
};

const explores = await explorers();
const res: Promise<void>[] = [];
for (const explr of explores) {
	const doThing = async (source) => {
		const urls = await getLabels(source);
		const res: string[][] = [];
		for (const url of urls) {
			console.log(url);
			const labels = await getTables(url);
			// @ts-ignore
			res.push(...labels);
		}
		await writeFile(
			`data/${source.slice(2, source.length - 1)}_out.json`,
			JSON.stringify(Object.fromEntries(res.filter(([a, b]) => a))),
			"utf8"
		);
	};
	res.push(doThing(explr));
}

await Promise.all(res);



await browser.close();