import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Admin from '../src/models/Admin.js';
import User from '../src/models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const email = process.argv[2]?.trim().toLowerCase();
const username = process.argv[3]?.trim();
const name = process.argv[4]?.trim() || 'OpNet Admin';
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sthirdb1';

function readHiddenPassword() {
	if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
		throw new Error('Run this script in an interactive terminal to enter the password securely.');
	}

	return new Promise((resolve, reject) => {
		const input = process.stdin;
		let password = '';
		process.stdout.write('Admin password (input hidden): ');
		input.setEncoding('utf8');
		input.setRawMode(true);
		input.resume();

		const finish = (error) => {
			input.setRawMode(false);
			input.pause();
			input.removeListener('data', onData);
			process.stdout.write('\n');
			if (error) reject(error);
			else resolve(password);
		};

		const onData = (chunk) => {
			for (const character of chunk) {
				if (character === '\u0003') return finish(new Error('Cancelled.'));
				if (character === '\r' || character === '\n') return finish();
				if (character === '\u0008' || character === '\u007f') {
					password = password.slice(0, -1);
				} else if (character >= ' ') {
					password += character;
				}
			}
		};

		input.on('data', onData);
	});
}

async function main() {
	if (!email || !username) {
		throw new Error('Usage: node scripts/create_admin_account.js <email> <username> [name]');
	}

	const databaseHost = new URL(mongoUri).hostname;
	if (!['localhost', '127.0.0.1', '::1'].includes(databaseHost)) {
		throw new Error('Refusing non-local MongoDB target. This utility is restricted to localhost.');
	}

	await mongoose.connect(mongoUri);
	try {
		const [adminByEmail, adminByUsername, userByEmail, userByUsername] = await Promise.all([
			Admin.exists({ email }),
			Admin.exists({ username }),
			User.exists({ email }),
			User.exists({ username }),
		]);
		if (adminByEmail || adminByUsername || userByEmail || userByUsername) {
			throw new Error('Email or username already exists; no account was changed.');
		}

		const password = await readHiddenPassword();
		if (!password) throw new Error('Password cannot be empty.');

		const admin = await Admin.create({ name, email, username, password, role: 'Admin', isActive: true });
		console.log(`Admin account created: ${admin.email} (${admin.username})`);
	} finally {
		await mongoose.disconnect();
	}
}

main().catch((error) => {
	console.error(error.message || 'Admin account creation failed.');
	process.exitCode = 1;
});
