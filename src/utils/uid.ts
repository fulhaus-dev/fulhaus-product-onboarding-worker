import crypto from "node:crypto";

import { v7 as uuidv7 } from "uuid";

function generate(prefix?: string) {
	const uuid = uuidv7();

	if (!prefix) return uuid;

	return `${prefix}-${uuid}`;
}

function random() {
	return crypto.randomUUID();
}

function generatePassword(length = 32) {
	const characters =
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+={}[]|;':\",./<>?";

	let password = "";

	const array = new Uint32Array(length);
	crypto.getRandomValues(array);
	for (let i = 0; i < length; i++) {
		password += characters.charAt(array[i] % characters.length);
	}

	return password;
}

const uid = {
	generate,
	random,
	generatePassword,
};

export default uid;
