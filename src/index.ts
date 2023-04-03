import { writeFile } from "fs/promises";
import puppeteer from "puppeteer-extra";
import Stealth from "puppeteer-extra-plugin-stealth";
import cheerio from "cheerio";

puppeteer.use(Stealth());
const browser = await puppeteer.launch({ headless: false });

const getLabels = async () => {
	const url = "https://etherscan.io/labelcloud";
	const response = await fetch(url);
	const html = await response.text();
	const $ = cheerio.load(html);

	const urls: string[] = [];

	$("a[href^='/accounts/label']").each((_, element) => {
		const href = $(element).attr("href");
		if (href) {
			urls.push(`https://etherscan.io${href}`);
		}
	});

	return urls;
};

const getTables = async (url) => {
	const page = await browser.newPage();
	await page.goto(url, { waitUntil: "networkidle0" });
	await page.waitForTimeout(6000);

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

export const scrapeResultsFor = async () => {
	const urls = await getLabels();
	const allLabels: string[][] = [];
	for (const url of urls) {
		console.log(url);
		const labels = await getTables(url);
		// @ts-ignore
		allLabels.push(...labels);
	}
	return allLabels;
};

const res = await scrapeResultsFor();

await writeFile("./out.json", JSON.stringify(Object.fromEntries(res)), "utf8");
