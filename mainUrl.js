const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const axios = require("axios");
const cheerio = require("cheerio");


async function findWebsiteUrl(data, driver) {
    let results = [];

    for (const d of data) {
        const name = d.companyName;
        const address = d.address;
        const id = d.id;
        const searchQuery = `${name} ${address}`.replace(/\s+/g, "+");
        const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}`;

        try {
            console.log(`🔍 Searching Google for: ${name} ${address}`);
            await driver.get(googleSearchUrl);
    
            // ✅ Remove the WebDriver flag (to avoid bot detection)
            await driver.executeScript(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
            );
    
            // ✅ Wait for search results
            await driver.wait(until.elementLocated(By.css(".tF2Cxc a")), 6000);
    
            let websiteElement = await driver.findElement(By.css(".tF2Cxc a"));
            let websiteUrl = await websiteElement.getAttribute("href");
    
            if (!websiteUrl) {
                results.push({ id:id, status: "error", message: "Website Doesn't Exist" });
                continue;
            }
    
            console.log("✅ Website URL Found:", websiteUrl);
            results.push({id:id,status:"success",url:websiteUrl})
        } catch (error) {
            console.error("❌ Error:", error.message);
            results.push({ id:id, status: "error", message: "Something went wrong" });
            continue;
        }
    }

    return results;
}


async function updateUrl(){
        const options = new chrome.Options();
        options.addArguments(
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled",
            "--disable-infobars",
            "--disable-popup-blocking",
            "--start-maximized",
            "--headless=new"
        );
        options.addArguments(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );
    
        let driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
    try{
        const response  = await axios.get('http://localhost:8000/masterLead/getEmptyUrl');
        const data = response.data;
        const results = await findWebsiteUrl(data.leads,driver);
        const responsePost = await axios.post('http://localhost:8000/masterLead/postUpdateUrl',{data:results})
        console.log(responsePost.data);
        const flagTrue = await axios.post('http://localhost:8000/masterLead/postIsWebsiteScraped',{data:results})
    }
    catch(error)
    {
        console.log("error",error);

    } finally {
        await driver.quit();
    }
}
updateUrl();
