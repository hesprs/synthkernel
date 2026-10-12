import nb from '../whitepaper.ipynb' with { type: 'json' };

type Cell = {
	cell_type: 'markdown' | 'code';
	source: string | Array<string>;
};

const md = (nb.cells as Array<Cell>)
	.map((cell) => {
		const src = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
		return cell.cell_type === 'code'
			? `\`\`\`typescript\n${src.trimEnd()}\n\`\`\``
			: src.trimEnd();
	})
	.join('\n\n');

await Bun.write('whitepaper.md', `${md}\n`);
