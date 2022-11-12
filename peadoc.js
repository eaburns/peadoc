const EMPTY = "EMPTY";
const HEADING = "h1";
const TEXT = "p";
const UITEM = "UITEM";
const OITEM = "OITEM";
const PRE = "pre";

const ulistPrefix = /^\s+[-*]\s+/;
const olistPrefix = /^\s+[0-9]+[.\)]\s+/;
const prePrefix = /^[   \t]+/;

function getItems(text) {
	let items = [];
	let lines = text.split(/\n/m);
	let heading = true;
	let n = 0;
	while (lines.length > 0) {
		const line = lines[0];
		let type = EMPTY;
		let more = function(line) { return false; };
		let preIndent = "";
		if (heading) {
			type = HEADING;
			more = function(line) { return line != ""; };
			heading = false;
		} else if (line == "") {
			type = EMPTY;
			more = function(line) { return line == ""; };
		} else if (ulistPrefix.test(line)) {
			type = UITEM
			more = function(line) {
				return line == "" || prePrefix.test(line) && !ulistPrefix.test(line) && !olistPrefix.test(line);
			};
		} else if (olistPrefix.test(line)) {
			type = OITEM
			more = function(line) {
				return line == "" || prePrefix.test(line) && !ulistPrefix.test(line) && !olistPrefix.test(line);
			};
		} else if (prePrefix.test(line)) {
			type = PRE;
			preIndent = leadingSpace(line);
			more = function(line) {
				if (line == "") {
					return true;
				}
				if (ulistPrefix.test(line) || olistPrefix.test(line)) {
					return false;
				}
				const indent = leadingSpace(line);
				const common = commonSpace(preIndent, indent);
				if (common == "") {
					return false;
				}
				preIndent = common;
				return true;
			};
		} else {
			type = TEXT;
			more = function(line) { return line != "" && leadingSpace(line) == ""; };
		}
		let item = {
			type: type,
			lines: [line],
		};
		let nonEmpty = false;
		for (let i = 1; i < lines.length; i++) {
			if (!more(lines[i])) {
				break;
			}
			item.lines.push(lines[i]);
		}
		while (item.type != EMPTY && item.lines.length > 0 && item.lines[item.lines.length-1] == "") {
			item.lines.pop();
		}
		if (item.lines.length == 0) {
			console.log("IMPOSSIBLE");
			break;
		}
		for (let i = 0; i < item.lines.length; i++) {
			lines.shift();
		}

		if (item.type == UITEM) {
			item.lines[0] = item.lines[0].replace(ulistPrefix, "");
		} else if (item.type == OITEM) {
			item.lines[0] = item.lines[0].replace(olistPrefix, "");
		} else if (item.type == PRE) {
			for (let i = 0; i < item.lines.length; i++) {
				item.lines[i] = item.lines[i].replace(preIndent, "");
			}
		}
		if (item.type != PRE) {
			for (let i = 0; i < item.lines.length; i++) {
				item.lines[i] = item.lines[i].replace(prePrefix, "").replace(/\s+/g, ' ');
			}
		}
		if (item.type == EMPTY) {
			heading = item.lines.length > 1;
			continue;
		}
		items.push(item);
	}
	return items;
}

function commonSpace(a, b) {
	let common = "";
	for (let i = 0; i < Math.min(a.length, b.length); i++) {
		if (a[i] != b[i]) {
			break;
		}
		common += a[i];
	}
	return common;
}

function leadingSpace(line) {
	let space = "";
	for (const c of line) {
		if (!isSpace(c)) {
			break;
		}
		space += c;
	}
	return space
}

function isSpace(c) {
	return /\s/.test(c);
}

function update(raw) {
	let rendered = document.getElementById('pretty');
	rendered.replaceChildren();
	let current = [rendered];
	let prev = EMPTY;
	for (const item of getItems(raw.value)) {
		if (item.type != OITEM && item.type != UITEM) {
			if (prev == OITEM || prev == UITEM) {
				current.pop();
			}
			let e = document.createElement(item.type);
			for (const line of item.lines){
				let t = document.createTextNode(line + '\n');
				e.appendChild(t);
			}
			current.at(-1).appendChild(e);
		} else {
			if (prev != item.type) {
				if (prev == OITEM || prev == UITEM) {
					current.pop();
				}
				let l;
				if (item.type == UITEM) {
					l = document.createElement('ul');
				} else {
					l = document.createElement('ol');
				}
				current.at(-1).appendChild(l);
				current.push(l);
			}
			let li = document.createElement('li');
			if (!hasEmptyLine(item.lines)) {
				for (const line of item.lines){
					let t = document.createTextNode(line + '\n');
					li.appendChild(t);
				}
			} else {
				let p = document.createElement('p');
				for (const line of item.lines) {
					if (line == "") {
						li.appendChild(p);
						p = document.createElement('p');
						continue;
					}
					let t = document.createTextNode(line + '\n');
					p.appendChild(t);
				}
				li.appendChild(p);
			}
			current.at(-1).appendChild(li);
		}
		prev = item.type;
	}
}

function hasEmptyLine(lines) {
	for (const line of lines) {
		if (line == "") {
			return true;
		}
	}
	return false;
}

const spec = `
Peadoc

Peadoc is a minimalistic document formatting system useful for documentation in source code. It is intended to be easy-to-read, and out-of-the way in normal text, but also easy to convert to richer formats like HTML.

The intent of Peadoc is not to write papers or books. It is intended for documentation appearing in code such as function comments or library-level comments. As such, it includes only features needed for short documents, and it attempts to avoid special markup syntax beyond items that one may happen to use otherwise when writing a non-marked-up "raw" text (such as - and * for list items).


Items

A document is divided into items. Each item is of one of the following types:

    * empty
    * heading
    * text
    * unordered entry
    * ordered entry
    * preformatted


Empty items

An empty item is a sequence of consecutive empty lines.
When formatting text empty items are ignored except for their role in delimiting other items.
If an empty item consists of more than a single empty line,
it delimits a section: the following item is interpreted as a heading.
Otherwise the empty item delimits the preceeding item.

Note that preformatted, unordered entry, and ordered entry items
may contain empty lines than are not empty items.
This is determined by the rules of how each of the items are delimited.
See below for details.


Heading items

A heading item is text following an empty item that has more than two empty lines.
It includes all text up until, but excluding, the next empty line.
A heading item is formatted as a section heading.


Text items

A text item is a sequence of consecutive lines that do not begin with whitespace.
Text items are formatted as paragraphs.
Any trailing whitespace is removed,
and runs of whitespace are collapsed to a single space character.


Unordered and Ordered entry items

Unordered and ordered entries are items in a list.

An unordered entry begins with a line starting with whitespace
followed by - or * and more whitespace.
An ordered entry begins with a line starting with whitespace
followed by a number followed by . or ) followed by whitespace.

The entry includes all text following the prefix
up until the next line that does not begin with whitespace,
excluding any trailing empty lines.
Note that this means that an unordered or ordered entry
may contain any number of empty lines,
so long as there is a following line that begins with whitespace.

Within an unordered or ordered entry text is formatted as a paragraph
nestned within the item of an unordored or ordered list item.
Empty lines within the entry's text is considered a paragraph break.
Within each such paragraph, leading and trailing whitespace is removed,
and runs of whitespace are collapsed to a single space character.

Multiple entry items of the same type for a single list.
Ordered entries in a single list are renumbered to count up from 1.


Preformatted items

A preformatted item is a block of pre-formatted text.

A preformatted item begins with a line starting with whitespace
that is not an unordered entry or an ordered entry.
It then includes all of the following empty lines
and lines that share a common whitespace prefix with the initial line
excluding any trailing empty lines.

The common whitespace prefix is removed from each line.
No other spaces are stripped or collapsed,
and the resulting lines are formatted in a monospace font.


Hyperlinks

If the final item of a document is a text item where every line is of the form:

    [text]: URL

Then it is interpreted as a list of citations.
In formats that support hyperlinks,
all occurrances of each [text] within non-preformatted items of the document
are replaced with the text itself (the [ and ] are removed)
and are made into hyperlinks to the corresponding URL.
`;


document.getElementById('raw').textContent = spec;
document.getElementById('raw').addEventListener('input', (e) => {update(e.target)});
update(document.getElementById('raw'));
