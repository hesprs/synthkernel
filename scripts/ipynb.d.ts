declare module '*.ipynb' {
	const value: { cells: Array<{ cell_type: string; source: string | Array<string> }> };
	export default value;
}
