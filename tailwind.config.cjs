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
				'header': '1fr auto',
			},
			gridTemplateColumns: {
				'header': '1fr auto',
			},
			// listStyleType: {
			// 	'diamond': '⬩',
			// }
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
