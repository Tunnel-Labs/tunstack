import escapeStringRegexp from 'escape-string-regexp';

export function createVariableWhitespaceRegexp(string: string) {
	return new RegExp(escapeStringRegexp(string).replaceAll(/\s+/g, '\\s+'));
}
