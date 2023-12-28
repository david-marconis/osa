#!/usr/bin/env node

import os from "os";
import { promisify } from "util";
import path from "node:path";
import puppeteer from "puppeteer";
import child_process from "child_process";

const microsoftLoginUrl = "login.microsoft.com";
const profilesPath = path.resolve(os.homedir(), ".osa/profiles");
const browserOptions = { userDataDir: profilesPath, headless: "new" };

const getTokenAndConnectToCluster = async page => {
  console.log("Getting token ...");
  await page.waitForSelector("button");
  await page.click("button");
  const preElement = await page.waitForXPath("//pre[starts-with(text(), 'oc login')]");
  const ocLogin = await page.evaluate(pre => pre.textContent, preElement);
  const exec = promisify(child_process.exec);
  const { stdout, stderr } = await exec(ocLogin).catch(e => {
    throw new Error(
      `Unable to launch oc binary. Make sure that it is on your path or run the command manually.\n${e.message}`
    );
  });
  console.log(stdout);
  console.error(stderr);
};

const loginToAzure = async azureUrl => {
  let authenticated = false;
  console.log("Please authenticate in browser pop-up ...");
  const browser = await puppeteer.launch({
    ...browserOptions,
    defaultViewport: null,
    args: [`--app=${azureUrl}`],
    headless: false,
  });
  browser.on("disconnected", () => {
    if (authenticated === false) {
      console.error("Authentication aborted.");
    }
  });
  const page = await browser.pages().then(pages => pages[0]);
  const azureLink = await page.waitForXPath("//a[contains(text(), 'azure-ad')]");
  await azureLink.click();
  browser.on("targetchanged", async target => {
    const url = new URL(target.url());
    if (url.pathname === "/oauth/token/display" && url.searchParams.has("code")) {
      await getTokenAndConnectToCluster(page);
      authenticated = true;
      await browser.close();
    }
  });
};

const browser = await puppeteer.launch(browserOptions);
try {
  const args = process.argv;
  if (args.length != 3) {
    throw new Error("No cluster provided, this program expects exactly 1 argument the cluster hostname.");
  }
  const osHostname = args[2];
  const osTokenRequestUrl = `https://oauth-openshift.apps.${osHostname}/oauth/token/request`;
  const page = await browser.pages().then(pages => pages[0]);
  console.log(`Logging in to OpenShift cluster: ${osHostname} ...`);
  await page.goto(osTokenRequestUrl, { waitUntil: "domcontentloaded" }).catch(e => {
    throw new Error(`Unable to reach ${osHostname}`, e);
  });
  const initialUrl = new URL(page.url());
  if (!initialUrl.hostname.startsWith("oauth-openshift")) {
    throw new Error(`Invalid state, unknown hostname: ${initialUrl.hostname}`);
  }
  const azureLink = await page.waitForXPath("//a[contains(text(), 'azure-ad')]");
  await azureLink.click();
  await page.waitForNavigation();
  const azureUrl = new URL(page.url());
  if (azureUrl.hostname === microsoftLoginUrl) {
    browser.close();
    await loginToAzure(osTokenRequestUrl);
  } else if (azureUrl.pathname === "/oauth/token/display") {
    await getTokenAndConnectToCluster(page);
  } else {
    console.error(`Invalid url detected : "${azureUrl}", exiting.`);
  }
} catch (error) {
  console.error(error.message);
} finally {
  await browser.close();
}
