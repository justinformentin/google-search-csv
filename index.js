// Get modules and setup settings
const Nightmare = require('nightmare'),
	fs = require('fs'),
	async = require('async'),
	nightmare = Nightmare({
		show: true,  // Handles visibility of Electron container
		waitTimeout: 85000
	 }),
	settings  = require('./settings');

// Get random amount of time 
const randomTime = (min, max) => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Parse DOM into properly structured array
const parseDOM = () => {
	let sheetArray = [],
		boxes = document.querySelectorAll('div.g');

	Array.prototype.forEach.call(boxes, (box) => {
		let x = [],
			title = box.querySelector('h3.r>a'),
			site = box.querySelector('cite'),
			para = box.querySelector('span.st');
		let titleText = title ? title.textContent : '',
			siteText = site ? site.textContent : '',
			paraText = para ? para.textContent : '';
		
		let domainEx = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/\n]+)/i,
			domainMatches = siteText.match(domainEx),
			domainShort = (domainMatches && domainMatches.length > 0) ? domainMatches[1] : '';
		x.push(titleText, paraText, siteText, domainShort);
		sheetArray.push(x);
	});
	return sheetArray;
};

// Generate proper amount of search pages to loop through
const startUrlLoop = () => {
	let urls = settings.items.map((term) => {
		return {
			url: settings.home,
			search : term
		};
	});

	async.eachSeries(urls, loadSearchPage, (err) => {
		if (err) {
			console.log(err);
		}
		console.log("Finished scraping data. Shutting down...");
		nightmare.end();
	});
};

// Begin loading of search page
const loadSearchPage = (urlObj, finished) => {
	console.log(`Navigating to ${urlObj.search}...`);
	nightmare
		.wait(randomTime(6500, 8500))
		.goto(urlObj.url)
		.wait('input[title="Search"]')
		.wait(randomTime(900, 1700))
		.type('input[title="Search"]', urlObj.search[0])
		.wait(randomTime(2300, 2900))
		.type('input[title="Search"]', urlObj.search.substr(1))
		.wait(randomTime(950, 1850))
		.click('button[value="Search"]')
		.wait('#resultStats')
		.evaluate(parseDOM)
		.then((sheet) => {
			if (sheet && sheet.length > 0) {
				console.log("Writing to csv file...");
				let csv = new CsvWriter();
				let download = csv.downloadCSV(sheet, urlObj.search);
				download.then(() => {
					finished();
				})
				.catch((err) => {
					console.log(err);
				});
			}
		})
		.catch((err) => console.log(err));
};

// Boot up application
const startApplication = () => {
	console.log("Bot starting...");

	nightmare
		.cookies.clearAll()
		.viewport(1024, 768)
		.useragent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2838.0 Safari/537.36')
		.run((err, nightmare) => {
			if (err) {
				console.log(err);
				nightmare.end();
			}
			console.log("Setup environment...");
			startUrlLoop();
		});
};

// CSV Writer class
function CsvWriter(del, enc) {
    this.del = del || ',';
    this.enc = enc || '"';

    this.escapeCol = (col) => {
        if(isNaN(col)) {
            if(!col) {
                col = '';
            } else {
                col = String(col);
                if(col.length > 0) {
                    col = col.split(this.enc).join(this.enc + this.enc);
                    col = this.enc + col + this.enc;
                }
            }
        }
        return col;
    };

    this.arrayToRow = (arr) => {
        let arr2 = arr.slice(0);
        let i, ii = arr2.length;
        for(i = 0; i < ii; i++) {
            arr2[i] = this.escapeCol(arr2[i]);
        }
        return arr2.join(this.del);
    };

    this.arrayToCSVString = (arr) => {
        let arr2 = arr.slice(0);
        arr2.unshift(["TITLE", "DESCRIPTION", "LINK", "DOMAIN"]); // COLUMN TITLES
        let i, ii = arr2.length;
        for(i = 0; i < ii; i++) {
            arr2[i] = this.arrayToRow(arr2[i]);
        }
        return arr2.join("\r\n");
    };

    this.downloadCSV = (arr, name) => {
		return new Promise((resolve, reject) => {
			let csvContent = this.arrayToCSVString(arr);
			fs.writeFile(`search-results/${name}.csv`, csvContent, 'utf8', (err) => {
				if (err) {
					console.log(err);
					reject(err);
				} else {
					console.log("Successfully saved!");
					resolve();
				}
			});
		});
    };
};

// Start the application
startApplication();