const meta = /\r\n|\r|\n|&|<|>/gu;
const entities = {
	"\r\n": "<br/>",
	"\r": "<br/>",
	"\n": "<br/>",
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
};
const escapeCode = function escapeCode(value) {
	return value.replace(meta, ($0) => entities[$0]);
};
const splitHeaderValues = function* splitHeaderValues(values) {
	const {length} = values;
	let index = 0;
	let value = "";
	while (index < length) {
		const pattern = /[^",]*/uy;
		pattern.lastIndex = index;
		const match = values.match(pattern);
		index = pattern.lastIndex;
		const part = match?.[0] ?? "";
		value = `${value}${part}`;
		if (index < length) {
			if (values.startsWith("\"", index)) {
				++index;
				const pattern = /[^"\\]*(\\[^][^"\\]*)*["\\]?/uy;
				pattern.lastIndex = index;
				const match = values.match(pattern);
				index = pattern.lastIndex;
				const part = match?.[0] ?? "";
				value = `${value}${part}`;
				if (index < length) {
					continue;
				}
			} else {
				++index;
			}
		}
		value = value.replaceAll(/^[\t ]+|[\t ]+$/gu, ""),
		yield value;
		value = "";
	}
};
const getMimeTypeEssence = function getMimeTypeEssence(headers) {
	const values = headers.get("content-type");
	if (values == null) {
		return null;
	}
	let essence = null;
	for (const value of splitHeaderValues(values)) {
		const pattern = /^[\t\n\r ]*([!#$%&'*+\-.0-9A-Z^_`a-z|~]+\/[!#$%&'*+\-.0-9A-Z^_`a-z|~]+)[\t\n\r ]*(;[^]*)?$/u;
		const match = value.match(pattern);
		const candidate = (match?.[1] ?? "*/*").toLowerCase();
		if (candidate !== "*/*" && (essence == null || candidate !== essence)) {
			essence = candidate;
		}
	}
	return essence;
};
const getSearchParams = function getSearchParams(request) {
	const fields = new URL(request.url).searchParams;
	return fields;
};
const getFormData = async function getFormData(request) {
	const clone = request.clone();
	try {
		const fields = await request.formData();
		try {
			await clone.body.cancel();
		} catch {}
		return fields;
	} catch {}
	try {
		const fields = new FormData();
		const essence = getMimeTypeEssence(request.headers);
		if (essence == null) {
			throw new TypeError();
		}
		if (essence.search(/^text\/plain$/u) === -1) {
			throw new TypeError();
		}
		const content = await clone.text();
		if (content.search(/^(([^\n\r]*)=([^\n\r]*)\r\n)*$/u) === -1) {
			throw new TypeError();
		}
		const entries = content.split("\r\n");
		entries.pop();
		for (const entry of entries) {
			const separator = entry.indexOf("=");
			const key = entry.slice(0, separator);
			const value = entry.slice(separator + 1);
			fields.append(key, value);
		}
		return fields;
	} catch {}
	const fields = new FormData();
	return fields;
};
const headerRequirements = {
	"content-type": true,
};
const headerValidators = Object.assign(Object.create(null), {
	"content-type"(value) {
		if (typeof value !== "string") {
			return false;
		}
		return value.search(/^application\/x-www-form-urlencoded$/u) !== -1;
	},
});
const fieldRequirements = {
	"_charset_": false,
	"nom": true,
	"prenom": true,
	"age": true,
	"naissance": true,
	"race": true,
	"vol": true,
	"telepathie": false,
	"telekinesie": false,
};
const fieldValidators = Object.assign(Object.create(null), {
	"_charset_"(value) {
		if (typeof value !== "string") {
			return false;
		}
		return value.search(/^UTF-8$/u) !== -1;
	},
	"nom"(value) {
		if (typeof value !== "string") {
			return false;
		}
		if (value === "") {
			return true;
		}
		return value.search(/^[^\n\r]+$/u) !== -1;
	},
	"prenom"(value) {
		if (typeof value !== "string") {
			return false;
		}
		if (value === "") {
			return true;
		}
		return value.search(/^[^\n\r]+$/u) !== -1;
	},
	"age"(value) {
		if (typeof value !== "string") {
			return false;
		}
		if (value === "") {
			return true;
		}
		return value.search(/^(100|[1-9]\d?)?0$/u) !== -1;
		// TODO: handle exponent and leading zeros
	},
	"naissance"(value) {
		if (typeof value !== "string") {
			return false;
		}
		if (value === "") {
			return true;
		}
		return value.search(/^((([1-9]\d*00|([1-9]\d*)?(0[48]|[2468][048]|[13579][26]))00|([1-9]\d*)?\d\d(0[48]|[2468][048]|[13579][26]))-02-29|([1-9]\d*0000|([1-9]\d*)?(0(0(0[1-9]|[1-9]\d)|[1-9]\d\d)|[1-9]\d{3}))-((0[13578]|1[02])-31|(0[13-9]|1[0-2])-(29|30)|(0[1-9]|1[0-2])-(0[1-9]|1\d|2[0-8])))$/u) !== -1;
		// TODO: handle leading zeros
	},
	"race"(value) {
		if (typeof value !== "string") {
			return false;
		}
		return value.search(/^(troll|incube|succube|djinn)$/u) !== -1;
	},
	"vol"(value) {
		if (typeof value !== "string") {
			return false;
		}
		return value.search(/^on$/u) !== -1;
	},
	"telepathie"(value) {
		if (typeof value !== "string") {
			return false;
		}
		return value.search(/^on$/u) !== -1;
	},
	"telekinesie"(value) {
		if (typeof value !== "string") {
			return false;
		}
		return value.search(/^on$/u) !== -1;
	},
});
const fetch = async function fetch(request) {
	const messages = [];
	let hasError = false;
	const {method} = request;
	if (method !== "POST") {
		hasError = true;
		messages.push(`<p class="fail">La méthode <code>${escapeCode(method)}</code> n'est pas valide.</p>`);
	} else {
		messages.push(`<p class="pass">La méthode <code>${escapeCode(method)}</code> est valide.</p>`);
	}
	const {pathname} = new URL(request.url);
	if (pathname !== "/") {
		hasError = true;
		messages.push(`<p class="fail">Le chemin <code>${escapeCode(pathname)}</code> n'est pas valide.</p>`);
	} else {
		messages.push(`<p class="pass">Le chemin <code>${escapeCode(pathname)}</code> est valide.</p>`);
	}
	const {headers} = request;
	for (const [key, validator] of Object.entries(headerValidators)) {
		const value = headers.get(key);
		if (value == null) {
			if (headerRequirements[key]) {
				hasError = true;
				messages.push(`<p class="fail">L'en-tête <code>${escapeCode(key)}</code> n'est pas présent.</p>`);
			} else {
				messages.push(`<p class="pass">L'en-tête <code>${escapeCode(key)}</code> n'est pas présent.</p>`);
			}
			continue;
		}
		if (!validator(value)) {
			hasError = true;
			messages.push(`<p class="fail">L'en-tête <code>${escapeCode(key)}</code> est présent, mais sa valeur <code>${escapeCode(value)}</code> n'est pas valide.</p>`);
			continue;
		}
		messages.push(`<p class="pass">L'en-tête <code>${escapeCode(key)}</code> est présent, et sa valeur <code>${escapeCode(value)}</code> est valide.</p>`);
	}
	const {body} = request;
	const fields = body == null ? getSearchParams(request) : await getFormData(request);
	for (const [key, validator] of Object.entries(fieldValidators)) {
		const values = fields.getAll(key);
		fields.delete(key);
		if (values.length === 0) {
			if (fieldRequirements[key]) {
				hasError = true;
				messages.push(`<p class="fail">Le champ <code>${escapeCode(key)}</code> n'est pas présent.</p>`);
			} else {
				messages.push(`<p class="pass">Le champ <code>${escapeCode(key)}</code> n'est pas présent.</p>`);
			}
			continue;
		}
		if (values.length > 1) {
			hasError = true;
			messages.push(`<p class="fail">Le champ <code>${escapeCode(key)}</code> est présent, mais plusieurs fois.</p>`);
			continue;
		}
		const value = values[0];
		if (!validator(value)) {
			hasError = true;
			messages.push(`<p class="fail">Le champ <code>${escapeCode(key)}</code> est présent, mais sa valeur <code>${escapeCode(value)}</code> n'est pas valide.</p>`);
			continue;
		}
		messages.push(`<p class="pass">Le champ <code>${escapeCode(key)}</code> est présent, et sa valeur <code>${escapeCode(value)}</code> est valide.</p>`);
	}
	for (const key of new Set(fields.keys())) {
		hasError = true;
		messages.push(`<p class="fail">Le champ <code>${escapeCode(key)}</code> est présent.</p>`);
	}
	if (hasError) {
		messages.push(`<p>Dommage… Votre formulaire n'est pas valide…</p>`);
	} else {
		messages.push(`<p>Bravo&nbsp;! Votre formulaire est valide&nbsp;!</p>`);
	}
	return new Response(`\
<!DOCTYPE html>
<html dir="ltr" lang="fr">
	<head>
		<title>Vérification du démon</title>
		<meta charset="utf-8"/>
		<meta name="viewport" content="width=device-width"/>
		<style>
			p.fail {
				color: brown;
			}
			p.pass {
				color: green;
			}
		</style>
	</head>
	<body>
		<h1>Vérification du démon</h1>
		<p>Vous verrez ici le résultat de votre envoi afin de vous aider dans l'exercice.</p>
${messages.length !== 0 ? `\t\t${messages.join(`\n\t\t`)}\n` : ""}\
	</body>
</html>
`, {
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			...(hasError ? {
				"Cache-Control": "no-store",
			} : {}),
		},
		status: hasError ? 400 : 200,
	});
};
export default {fetch};
