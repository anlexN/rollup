const path = require('path');
const assert = require('assert');
const sander = require('sander');
const fixturify = require('fixturify');
const rollup = require('../../dist/rollup');
const { extend, loadConfig } = require('../utils.js');

const samples = path.resolve(__dirname, 'samples');

const FORMATS = ['es', 'cjs', 'amd', 'system'];

describe('chunking form', () => {
	sander.readdirSync(samples).sort().forEach(dir => {
		if (dir[0] === '.') return; // .DS_Store...

		const config = loadConfig(samples + '/' + dir + '/_config.js');

		if (config.skipIfWindows && process.platform === 'win32') return;
		if (!config.options) {
			config.options = {};
		}

		const options = extend(
			{},
			{
				input: [samples + '/' + dir + '/main.js'],
				experimentalCodeSplitting: true,
				experimentalDynamicImport: true,
				onwarn: msg => {
					if (/No name was provided for/.test(msg)) return;
					if (/as external dependency/.test(msg)) return;
					console.error(msg);
				}
			},
			config.options
		);

		(config.skip ? describe.skip : config.solo ? describe.only : describe)(dir, () => {
			let promise;
			const createBundle = () => promise || (promise = rollup.rollup(options));

			FORMATS.forEach(format => {
				it('generates ' + format, () => {
					process.chdir(samples + '/' + dir);

					return createBundle().then(bundle => {
						const options = extend({}, config.options, {
							dir: samples + '/' + dir + '/_actual/' + format,
							format,
							indent: !('indent' in config.options) ? true : config.options.indent,
						});

						sander.rimrafSync(options.dir);

						return bundle.write(options).then(() => {
							const actualFiles = fixturify.readSync(path.join(samples, dir, '_actual', format));

							let expectedFiles;
							try {
								expectedFiles = fixturify.readSync(path.join(samples, dir, '_expected', format));
							} catch (err) {
								expectedFiles = [];
							}

							assert.deepEqual(actualFiles, expectedFiles);
						});
					});
				});
			});
		});
	});
});
