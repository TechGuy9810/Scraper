const { Builder, By } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const axios = require("axios");
async function getContactLinks(driver) {
    const contactLinks = new Set();
    const elements = await driver.findElements(By.tagName("a"));

    for (let element of elements) {
        try {
            let href = await element.getAttribute("href");
    
            if (
                href &&
                !/instagram\.com|facebook\.com|twitter\.com|x\.com|linkedin\.com|pinterest\.com|tiktok\.com|youtube\.com/i.test(href) &&
                /(contact|about|help|support|services|stylists|professionals|booking|book|appointment|team|staff|gallery|reviews|testimonials|spa|salon|parlour|barber|nails|waxing|facial|massage|beauty|therapy|grooming|makeup|skincare|wellness|hair|treatment|pricing|packages|membership|offers|deals|discounts|specials|plans|gift-cards|loyalty|subscribe|inquiry|request|quote|estimate|faq|terms|policy|privacy|blog|articles|news|media|events|press|careers|jobs|location|branches|near-me|store-locator|visit|hours|directions|map)/i.test(href) // Include possible email pages
            ) {
                contactLinks.add(href);
            }
        } catch (error) {
            continue;
        }
    }
    return [...contactLinks]; // Convert Set to Array
}
    

// ✅ Function to scrape emails from a website
async function scrapeEmail(data,driver) {
    let results = [];

    for (const d of data) {
        const url = d.website;
        const id = d.id;
    try {
        console.log(`🔍 Scraping emails from: ${url}`);
        await driver.get(url);

        // ✅ Remove WebDriver flag to avoid bot detection
        await driver.executeScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");

        let pageSource = await driver.getPageSource();
        
        // ✅ Extract emails directly using regex with length constraint (≤ 35 chars)
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(?!xml|png|jpg|jpeg|gif|svg|pdf|zip|exe|mp3|mp4|avi|mov|mkv|wav|flac|io|tar|gz|rar|doc|xls|ppt|iso)[a-zA-Z]{2,}/g;
        let allEmails = new Set(
            (pageSource.match(emailPattern) || []).filter(email => email.length <= 35 && !email.startsWith("jobs") && !email.startsWith("careers"))
        );

        // ✅ Extract emails from contact pages
        let contactPages = await getContactLinks(driver);
        for (let contactUrl of contactPages) {
            try {
                console.log(`🔍 Checking Contact Page: ${contactUrl}`);
                await driver.get(contactUrl);
                let contactSource = await driver.getPageSource();
                let extractedEmails = (contactSource.match(emailPattern) || []).filter(email => email.length <= 35 && !email.startsWith("jobs") && !email.startsWith("careers"));
                allEmails = new Set([...allEmails, ...extractedEmails]);
            } catch (error) {
                console.log(`❌ Failed to access ${contactUrl}:`, error.message);
                continue;
            }
        }
        results.push({ emails: [...allEmails],status:"success",id:id });

    } catch (error) {
        console.error("❌ Error:", error.message);
        results.push({ emails: [], status:"error",id:id })
        continue;
    } 
    return results;
}
}



async function updateEmail(){
    const options = new chrome.Options();
    options.addArguments(
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--disable-popup-blocking",
        "--start-maximized",
        "--headless=new" // Remove this if you want to see the browser
    );

    options.addArguments(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    let driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
    try{
        const response  = await axios.get('http://localhost:8000/masterLead/getEmptyEmail');
        const data = response.data.websites;
        const results = await scrapeEmail(data,driver);
        console.log(results);
        const responsePost = await axios.post('http://localhost:8000/masterLead/postUpdateEmails',{data:results})
        console.log(responsePost.data);
        const flagTrue = await axios.post('http://localhost:8000/masterLead/postIsEmailScraped',{data:results})
    }
    catch(error)
    {
        console.log("error",error);

    } finally {
        await driver.quit();
    }
}
updateEmail();