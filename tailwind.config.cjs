/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./src/components/**/*.{astro,jsx,tsx}',
		'./src/layouts/**/*.astro',
		'./src/pages/**/*.astro',
	],
	theme: {
		extend: {
			gridTemplateRows: {
				'body': 'auto 1fr auto',
				'header': '1fr auto',
				'auto-rest': 'auto 1fr',
			},
			gridTemplateColumns: {
				'header': '1fr auto',
				'site-md': 'minmax(0, 1fr) minmax(0, 3fr)',
				'site-lg': 'minmax(0, 1fr) minmax(0, 4fr) minmax(0, 1fr)',
			},
			listStyleType: {
				'diamond': '"⬩"',
			},
			width: {
				'32': '8rem',
			},
		},
		fontFamily: {
			'sans': [
				'system-ui',
				'sans-serif',
			],
			'mono': [
				'ui-monospace',
				'"Cascadia Code"',
				'"Source Code Pro"',
				'Menlo',
				'Consolas',
				'"DejaVu Sans Mono"',
				'monospace'
			],
			'heading': [
				'"Orbitron"',
				'system-ui',
				'sans-serif'
			],
		}
	},
	plugins: [],
}
