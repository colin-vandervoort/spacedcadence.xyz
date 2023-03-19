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
				'"Lexend Deca"',
				'sans-serif'
			],
			'mono': [
				'"Noto Sans Mono"',
				'Menlo',
				'monospace'
			],
			'heading': [
				'"Orbitron"',
				'sans-serif'
			],
		}
	},
	plugins: [],
}
