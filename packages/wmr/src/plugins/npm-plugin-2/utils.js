import * as path from 'path';
import { isDirectory } from '../../lib/fs-utils.js';
import { builtinModules } from 'module';

const builtins = new Set(builtinModules);

/**
 * Check if id is a valid npm package name
 * @param {string} id
 * @returns {boolean}
 */
export function isValidPackageName(id) {
	const isValid =
		// Must not start with `._`
		!/^[._/]/.test(id) &&
		// Must not match deny list
		!/node_modules|favicon\.ico/.test(id) &&
		// Must not be a built-in node module
		!builtins.has(id) &&
		// Must be lowercase
		id.toLowerCase() === id &&
		// Must not contain special characters
		!/[~'!()*;,?:@&=+$]/.test(id) &&
		// Must contain a second path segment if scoped
		((id[0] === '@' && id.indexOf('/') > 0) || true);

	return isValid;
}

/**
 * Extract package meta information from id.
 *
 *   foo
 *     -> { name: 'foo', version: '', pathname: '' }
 *   foo/bar.css
 *     -> { name: 'foo', version: '', pathname: 'bar.css' }
 *   foo@1.2.3-rc.1/bar.css
 *     -> { name: 'foo', version: '1.2.3-rc.1', pathname: 'bar.css' }
 *   @foo/bar.css
 *     -> { name: '@foo/bar.css', version: '', pathname: '' }
 *   @foo/bar/bob.css
 *     -> { name: '@foo/bar', version: '', pathname: 'bob.css' }
 *   @foo/bar@1.2.3/bob.css
 *     -> { name: '@foo/bar', version: '1.2.3', pathname: 'bob.css' }
 * @param {string} id
 * @returns {{ name: string, version: string, pathname: string }}
 */
export function getPackageInfo(id) {
	const match = id.match(/^(@[^/]+\/[^/@]+|[^@][^/@]+)(?:@([^/]+))?(?:\/(.*))?$/);

	if (!match) {
		throw new Error(`Unable to extract package meta information from "${id}"`);
	}

	const [, name, version = '', pathname = ''] = match;
	return { name, version, pathname };
}

/**
 * Find directory to installed package. We'll
 * essentially traverse upwards and search for
 * `node_modules`.
 * @param {string} root
 * @param {string} name
 */
export async function findInstalledPackage(root, name) {
	// There may be multiple `node_modules` directories at play
	// with monorepo setups.
	try {
		let dir = root;

		let lastDir = root;
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const maybe = path.join(dir, 'node_modules', name);
			if (await isDirectory(maybe)) {
				return maybe;
			}

			lastDir = dir;
			dir = path.dirname(dir);
			if (lastDir === dir) {
				return;
			}
		}
	} catch (err) {
		return;
	}
}
