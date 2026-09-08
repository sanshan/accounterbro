import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ruleFields = [
    'id',
    'title',
    'scope',
    'applies_when',
    'violation',
    'non_violation',
    'severity',
    'evidence',
    'canonical_source',
];
const calibrationFields = ['rule_id', 'cases'];
const caseFields = ['id', 'expected', 'context', 'diff'];
const severities = new Set(['blocking', 'advisory']);
const decisions = new Set(['not-applicable', 'violation', 'no-violation']);
const ruleIdPattern = /^PRR-\d{3}$/;
const canonicalHeadingTextPattern = /^[\p{L}\p{N}\p{M} ._-]+$/u;
const modulePath = fileURLToPath(import.meta.url);
const defaultRepositoryRoot = resolve(dirname(modulePath), '../..');

export class ReviewCatalogValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ReviewCatalogValidationError';
    }
}

function fail(message) {
    throw new ReviewCatalogValidationError(message);
}

function assertPlainObject(value, label) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        fail(`${label} must be a JSON object`);
    }
}

function assertExactFields(value, expectedFields, label) {
    const actualFields = Object.keys(value);
    const missing = expectedFields.filter((field) => !actualFields.includes(field));
    const unexpected = actualFields.filter((field) => !expectedFields.includes(field));

    if (missing.length > 0) {
        fail(`${label} is missing required fields: ${missing.join(', ')}`);
    }

    if (unexpected.length > 0) {
        fail(`${label} has unexpected fields: ${unexpected.join(', ')}`);
    }
}

function assertNonEmptyString(value, label) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        fail(`${label} must be a non-empty string`);
    }
}

async function parseJson(filePath, label) {
    let source;

    try {
        source = await readFile(filePath, 'utf8');
    } catch (error) {
        fail(`${label} cannot be read: ${error.message}`);
    }

    try {
        return JSON.parse(source);
    } catch (error) {
        fail(`${label} is not valid JSON: ${error.message}`);
    }
}

async function listJsonFiles(directory, label) {
    let entries;

    try {
        entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
        fail(`${label} directory cannot be read: ${error.message}`);
    }

    const unexpected = entries.filter(
        (entry) => !entry.isFile() || extname(entry.name) !== '.json',
    );

    if (unexpected.length > 0) {
        fail(`${label} directory contains unexpected entries: ${unexpected.map((entry) => entry.name).join(', ')}`);
    }

    return entries.map((entry) => resolve(directory, entry.name)).sort();
}

function addCanonicalHeadingFragment(headingText, fragments) {
    if (!canonicalHeadingTextPattern.test(headingText)) {
        return;
    }

    const baseFragment = headingText
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
        .replace(/\s+/g, '-');

    if (!baseFragment) {
        return;
    }

    let fragment = baseFragment;
    let suffix = 0;

    while (fragments.has(fragment)) {
        suffix += 1;
        fragment = `${baseFragment}-${suffix}`;
    }

    fragments.add(fragment);
}

function collectMarkdownHeadingFragments(source) {
    const fragments = new Set();
    let fence = null;
    let htmlComment = false;

    for (const line of source.split(/\r?\n/)) {
        if (fence) {
            const closingFence = new RegExp(`^ {0,3}${fence.marker}{${fence.length},}[ \t]*$`);

            if (closingFence.test(line)) {
                fence = null;
            }

            continue;
        }

        if (htmlComment) {
            if (line.includes('-->')) {
                htmlComment = false;
            }

            continue;
        }

        const openingFence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);

        if (openingFence) {
            fence = { marker: openingFence[1][0], length: openingFence[1].length };
            continue;
        }

        if (/^ {0,3}<!--/.test(line)) {
            htmlComment = !line.includes('-->');
            continue;
        }

        const heading = /^ {0,3}(#{1,6})(?:[ \t]+|$)(.*)$/.exec(line);

        if (!heading) {
            continue;
        }

        const headingText = heading[2].replace(/[ \t]+#+[ \t]*$/, '').trim();
        addCanonicalHeadingFragment(headingText, fragments);
    }

    return fragments;
}

async function assertCanonicalSource(repositoryRoot, canonicalSource, label) {
    const fragmentSeparatorIndex = canonicalSource.indexOf('#');
    const sourcePath =
        fragmentSeparatorIndex === -1
            ? canonicalSource
            : canonicalSource.slice(0, fragmentSeparatorIndex);
    const fragment =
        fragmentSeparatorIndex === -1
            ? null
            : canonicalSource.slice(fragmentSeparatorIndex + 1);

    if (!sourcePath || isAbsolute(sourcePath)) {
        fail(`${label} must reference a repository-relative file path`);
    }

    if (fragment === '') {
        fail(`${label} must not contain an empty fragment`);
    }

    const resolvedSource = resolve(repositoryRoot, sourcePath);
    const repositoryRelative = relative(repositoryRoot, resolvedSource);

    if (
        repositoryRelative === '..' ||
        repositoryRelative.startsWith(`..${sep}`) ||
        isAbsolute(repositoryRelative)
    ) {
        fail(`${label} must stay inside the repository`);
    }

    let sourceStat;

    try {
        sourceStat = await stat(resolvedSource);
    } catch {
        fail(`${label} points to a missing repository file: ${sourcePath}`);
    }

    if (!sourceStat.isFile()) {
        fail(`${label} must point to a repository file: ${sourcePath}`);
    }

    if (fragment === null) {
        return;
    }

    if (extname(sourcePath).toLowerCase() !== '.md') {
        fail(`${label} fragments are only supported for Markdown files`);
    }

    let source;

    try {
        source = await readFile(resolvedSource, 'utf8');
    } catch (error) {
        fail(`${label} cannot read canonical source file: ${error.message}`);
    }

    const fragments = collectMarkdownHeadingFragments(source);

    if (!fragments.has(fragment)) {
        fail(`${label} points to a missing supported Markdown heading fragment: ${fragment}`);
    }
}

function validateRuleShape(rule, label) {
    assertPlainObject(rule, label);
    assertExactFields(rule, ruleFields, label);

    for (const field of ruleFields) {
        assertNonEmptyString(rule[field], `${label}.${field}`);
    }

    if (!ruleIdPattern.test(rule.id)) {
        fail(`${label}.id must match ${ruleIdPattern}`);
    }

    if (!severities.has(rule.severity)) {
        fail(`${label}.severity must be one of: ${[...severities].join(', ')}`);
    }
}

function validateCalibrationShape(calibration, label) {
    assertPlainObject(calibration, label);
    assertExactFields(calibration, calibrationFields, label);
    assertNonEmptyString(calibration.rule_id, `${label}.rule_id`);

    if (!Array.isArray(calibration.cases) || calibration.cases.length === 0) {
        fail(`${label}.cases must be a non-empty array`);
    }

    const caseIds = new Set();

    for (const [index, calibrationCase] of calibration.cases.entries()) {
        const caseLabel = `${label}.cases[${index}]`;
        assertPlainObject(calibrationCase, caseLabel);
        assertExactFields(calibrationCase, caseFields, caseLabel);

        for (const field of caseFields) {
            assertNonEmptyString(calibrationCase[field], `${caseLabel}.${field}`);
        }

        if (caseIds.has(calibrationCase.id)) {
            fail(`${label} contains duplicate case id: ${calibrationCase.id}`);
        }
        caseIds.add(calibrationCase.id);

        if (!decisions.has(calibrationCase.expected)) {
            fail(`${caseLabel}.expected must be one of: ${[...decisions].join(', ')}`);
        }
    }
}

export async function validateReviewCatalog(repositoryRoot = defaultRepositoryRoot) {
    const rulesDirectory = resolve(repositoryRoot, 'docs/review/rules');
    const calibrationDirectory = resolve(repositoryRoot, 'docs/review/calibration');
    const ruleFiles = await listJsonFiles(rulesDirectory, 'Rule catalog');
    const calibrationFiles = await listJsonFiles(calibrationDirectory, 'Calibration catalog');

    if (ruleFiles.length === 0) {
        fail('Rule catalog must contain at least one rule');
    }

    const rules = new Map();

    for (const ruleFile of ruleFiles) {
        const label = `Rule ${basename(ruleFile)}`;
        const rule = await parseJson(ruleFile, label);
        validateRuleShape(rule, label);

        if (rules.has(rule.id)) {
            fail(`Rule catalog contains duplicate id: ${rule.id}`);
        }

        const expectedFilename = `${rule.id}.json`;
        if (basename(ruleFile) !== expectedFilename) {
            fail(`${label} must be named ${expectedFilename}`);
        }

        await assertCanonicalSource(repositoryRoot, rule.canonical_source, `${label}.canonical_source`);
        rules.set(rule.id, rule);
    }

    const calibrations = new Map();
    let calibrationCaseCount = 0;

    for (const calibrationFile of calibrationFiles) {
        const label = `Calibration ${basename(calibrationFile)}`;
        const calibration = await parseJson(calibrationFile, label);
        validateCalibrationShape(calibration, label);

        if (!rules.has(calibration.rule_id)) {
            fail(`${label} references unknown rule: ${calibration.rule_id}`);
        }

        if (calibrations.has(calibration.rule_id)) {
            fail(`Calibration catalog contains duplicate rule_id: ${calibration.rule_id}`);
        }

        const expectedFilename = `${calibration.rule_id}.json`;
        if (basename(calibrationFile) !== expectedFilename) {
            fail(`${label} must be named ${expectedFilename}`);
        }

        calibrations.set(calibration.rule_id, calibration);
        calibrationCaseCount += calibration.cases.length;
    }

    let blockingRuleCount = 0;

    for (const rule of rules.values()) {
        if (rule.severity !== 'blocking') {
            continue;
        }

        blockingRuleCount += 1;
        const calibration = calibrations.get(rule.id);

        if (!calibration) {
            fail(`Blocking rule ${rule.id} is missing calibration cases`);
        }

        const expectedDecisions = new Set(calibration.cases.map((item) => item.expected));

        if (!expectedDecisions.has('violation')) {
            fail(`Blocking rule ${rule.id} must have a known violation case`);
        }

        if (!expectedDecisions.has('no-violation') && !expectedDecisions.has('not-applicable')) {
            fail(`Blocking rule ${rule.id} must have a no-violation or not-applicable boundary case`);
        }
    }

    return {
        ruleCount: rules.size,
        blockingRuleCount,
        calibrationCaseCount,
    };
}

if (process.argv[1] === modulePath) {
    try {
        const result = await validateReviewCatalog();
        const summary = [
            `Review catalog valid: ${result.ruleCount} rules`,
            `${result.blockingRuleCount} blocking`,
            `${result.calibrationCaseCount} calibration cases.`,
        ].join(', ');
        console.log(summary);
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    }
}
