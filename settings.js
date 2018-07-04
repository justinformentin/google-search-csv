let searchItems = [
	'Bitcoin',
	'Litecoin',
	'Ethereum',
	'Ripple',
	'Monero',

	...process.argv.slice(2)
];

let settings = {
	home : 'http://www.google.com/',
	items : searchItems
};

module.exports = settings;