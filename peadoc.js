const leadingSpaceRegexp = /^\s+/;
const listRegexp = /^\s+([*\-]|[0-9]+[.)])/;
const unorderedRegexp = /^\s+[*\-]/;
const orderedRegexp = /^\s+[0-9]+[.)]/;

const NORMAL = "normal";
const ORDERED = "ordered";
const UNORDERED = "unordered";
const PREFORMATTED = "preformatted";

let lines = [];

function collapseSpace(str) {
	return str.replace(/[   \t]+/g, ' ').replace(/^ +/, '');
}

function normal() {
	let text = "";
	while (lines.length > 0 && lines[0] != "" && !leadingSpaceRegexp.test(lines[0])) {
		if (text != "") {
			text += "\n";
		}
		text += lines[0];
		lines.shift();
	}
	return {type: NORMAL, text: collapseSpace(text)};
}

function unordered() {
	let text = lines[0].replace(unorderedRegexp, '');
	lines.shift();
	while (lines.length > 0 && (lines[0] == "" || leadingSpaceRegexp.test(lines[0]) && !listRegexp.test(lines[0]))) {
		if (lines[0] == "") {
			text += "\n"
		} else {
			text += lines[0];
		}
		lines.shift();
	}
	return {type: UNORDERED, text: collapseSpace(text)};
}

function ordered() {
	let text = lines[0].replace(orderedRegexp, '');
	lines.shift();
	while (lines.length > 0 && (lines[0] == "" || leadingSpaceRegexp.test(lines[0]) && !listRegexp.test(lines[0]))) {
		if (lines[0] == "") {
			text += "\n"
		} else {
			text += lines[0];
		}
		lines.shift();
	}
	return {type: ORDERED, text: collapseSpace(text)};
}

function preformatted() {
	let text = lines[0] + '\n';
	lines.shift();
	while (lines.length > 0 && lines[0] == "" || leadingSpaceRegexp.test(lines[0])) {
		text += lines[0] + '\n'
		lines.shift();
	}
	return {type: PREFORMATTED, text: text};
}

function paragraph() {
	let paragraph = [];
	let i = 0;
	while (lines.length > 0 && lines[0] != "") {
		let block = {};
		if (unorderedRegexp.test(lines[0])) {
			block = unordered();
		} else if (orderedRegexp.test(lines[0])) {
			block = ordered();
		} else if (leadingSpaceRegexp.test(lines[0])) {
			block = preformatted();
		} else {
			block = normal();
		}
		paragraph.push(block);
	}
	return paragraph;
}

function section() {
	let heading = "";
	while (lines.length > 0 && lines[0] != "") {
		if (heading != "") {
			heading += "\n";
		}
		heading += lines[0];
		lines.shift();
	}

	let paragraphs = [];
	while (lines.length > 0) {
		paragraphs.push(paragraph());
		if (lines.length > 2 && lines[0] == "" && lines[1] == "") {
			break;
		}
		if (lines.length > 0) {
			lines.shift(); // remove paragraph-ending the blank line.
		}
	}
	return {
		heading: collapseSpace(heading),
		paragraphs: paragraphs,
	};
}

function escapeHtml(unsafe)
{
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
 }

function update() {
	const src = document.getElementById('raw').innerText;
	lines = src.split('\n');

	let sections = [];
	while (lines.length > 0) {
		sections.push(section());
		// Remove section ending blank lines.
		while (lines.length > 0 && lines[0] == "") {
			lines.shift();
		}
	}

	let html = "";
	for (let section of sections) {
		html += '<h1>';
		html += escapeHtml(section.heading).replace('\n', '<br>');
		html += '</h1>\n';
		for (let paragraph of section.paragraphs) {
			if (paragraph.length == 0) {
				continue;
			}
			let prev = NORMAL;
			for (let block of paragraph) {
				if (block.type == NORMAL) {
					if (prev == ORDERED) {
						html += '</ol>\n';
					} else if (prev == UNORDERED) {
						html += '</ul>\n';
					}
					prev = NORMAL;
					html += '<p>' + escapeHtml(block.text) + '</p>\n';
				} else if (block.type == UNORDERED) {
					if (prev == ORDERED) {
						html += '</ol>\n';
					}
					if (prev != UNORDERED) {
						html += '<ul>\n';
					}
					prev = UNORDERED;
					html += '<li>';
					for (let line of block.text.split('\n')) {
						html += '\n	<p>' + escapeHtml(line) + '</p>';
					}
					html += '</li>\n';
				} else if (block.type == ORDERED) {
					if (prev == UNORDERED) {
						html += '</ul>\n';
					}
					if (prev != ORDERED) {
						html += '<ol>\n';
					}
					prev = ORDERED;
					html += '<li>';
					for (let line of block.text.split('\n')) {
						html += '\n	<p>' + escapeHtml(line) + '</p>';
					}
					html += '</li>\n';
				} else if (block.type == PREFORMATTED) {
					if (prev == ORDERED) {
						html += '</ol>\n';
					} else if (prev == UNORDERED) {
						html += '</ul>\n';
					}
					prev = PREFORMATTED;
					html += '<pre>' + escapeHtml(block.text) + '</pre>\n';
				}
			}
			if (prev == ORDERED) {
				html += '</ol>\n';
			} else if (prev == UNORDERED) {
				html += '</ul>\n';
			}
		}
	}
	console.log("html=\n", html);
	document.getElementById('pretty').innerHTML= html;
}

const spec =`Introduction

Peadoc is a minimalistic document formatting system useful for documentation in source code. It is intended to be easy-to-read, and out-of-the way in normal text, but also easy to convert to richer formats like HTML.

The intent of Peadoc is not to write papers or books. It is intended for documentation appearing in code such as function comments or library-level comments. As such, it includes only features needed for short documents, and it attempts to avoid special markup syntax beyond items that one may happen to use otherwise when writing a non-marked-up "raw" text (such as - and * for list items).


The beginning and the end

Empty lines at the beginning of the file are ignored.

The end-of-file and all immediately preceding empty lines are treated as-if a single empty line.

A text begins at either at the beginning of a new section (full mode) or at the beginning of a paragraph (partial mode).


Sections

A section begins with a heading and is followed, optionally, by blocks.

A section heading is a sequence of non-empty lines.
Runs of non-newline whitespace in a section heading are replaced by single spaces.
Line-leading whitespace in a section heading is removed.


Paragraphs

After a section header is a possibly empty sequence of paragraphs. Paragraphs can contain normal text, lists, and pre-formatted blocks.

A line that does not begin with whitespace is a normal text line.
A line beginning with whitespace followed by -, *, or a number followed by . or ) begins a list item.
Any other line beginning with whitespace begins a pre-formatted block.

Two or more blank lines that are not part of a pre-formatted block end the current section and begin a new one.
A single blank line that is not part of a list item or pre-formatted block ends the paragraph.


Normal text

Runs of whitespace within normal text are replaced with a single space.


Lists

A list item starts with a line that begins with whitespace followed by -, *, or a number followed by . or ) and it contains all following lines that are either a single empty line or begin with whitespace and are not themselves list items.

Text within a list item is in paragraphs of normal text where empty lines within the item denote paragraph breaks.

A list item preceded by another list item of the same type (unordered/ordered) belongs to the same list. Otherwise it begins a new list within the containing paragraph.

Ordered lists are re-numbered from 1. Lists cannot nest, and they cannot contain pre-formatted text.


Pre-formatted text

A block of pre-formatted text starts with a line that begins with whitespace that is not a list item, and it contains all following lines up until the first line that does not begin with a common prefix of leading whitespace.

The longest common prefix of leading whitespace is removed from all lines of the pre-formatted text block. Trailing empty lines are also removed.


Hyperlinks

If the final paragraph contains all lines of the form
    [text]: URL
then it is interpreted as a bibliography.

In formats where possible, all non-preformatted occurrences of [text] outside the bibliography are replaced by the text as the text of a hyperlink linking to the corresponding URL.
`

document.getElementById('raw').innerText = spec;
document.getElementById('raw').addEventListener('input', update);
update();
