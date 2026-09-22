const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function executeWandbox(language, code, stdin) {
    let compiler = '';
    let finalCode = code;

    if (language === 'C++') {
        compiler = 'gcc-13.2.0';
    } else if (language === 'C') {
        compiler = 'gcc-13.2.0-c';
    } else if (language === 'Python') {
        compiler = 'cpython-3.12.7';
    } else if (language === 'JavaScript') {
        compiler = 'nodejs-20.17.0';
        finalCode = `
\n${code}\n
try {
    const fs = require('fs');
    const inputData = fs.readFileSync(0, 'utf-8');
    if (typeof solve === 'function') {
        const res = solve(inputData);
        if (res !== undefined && res !== null) {
            console.log(res);
        }
    } else if (typeof main === 'function') {
        const res = main(inputData);
        if (res !== undefined && res !== null) {
            console.log(res);
        }
    }
} catch (e) {
    console.error(e.message || e.toString());
    process.exit(1);
}
`;
    } else {
        throw new Error(`Unsupported language: ${language}`);
    }

    const maxRetries = 4;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const response = await fetch('https://wandbox.org/api/compile.json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    compiler,
                    code: finalCode,
                    stdin
                })
            });

            if (!response.ok) {
                throw new Error(`Execution service returned status ${response.status}`);
            }

            const data = await response.json();

            const isResourceError =
                (data.program_error && (data.program_error.includes('Resource temporarily unavailable') || data.program_error.includes('crun'))) ||
                (data.compiler_error && (data.compiler_error.includes('Resource temporarily unavailable') || data.compiler_error.includes('crun')));

            if (isResourceError && attempt < maxRetries - 1) {
                attempt++;
                const backoff = 1500 * attempt;
                console.warn(`[Wandbox API] OCI crun clone resource error on attempt ${attempt}. Retrying in ${backoff/1000}s...`);
                await sleep(backoff);
                continue;
            }

            return data;
        } catch (error) {
            if (attempt < maxRetries - 1) {
                attempt++;
                const backoff = 1500 * attempt;
                console.warn(`[Wandbox API] Request error on attempt ${attempt}: ${error.message}. Retrying in ${backoff/1000}s...`);
                await sleep(backoff);
            } else {
                throw error;
            }
        }
    }
}

function sanitizeError(msg) {
    if (!msg) return '';
    let clean = msg;

    const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 1 && (clean.includes('Traceback') || clean.includes('Error:') || clean.includes('SyntaxError:'))) {
        let lastLine = lines[lines.length - 1];
        let lineNumStr = '';

        for (let i = lines.length - 2; i >= 0; i--) {
            const match = lines[i].match(/line (\d+)/);
            if (match) {
                lineNumStr = ` (at line ${match[1]})`;
                break;
            }
        }

        clean = lastLine + lineNumStr;
    }

    clean = clean.replace(/\/home\/wandbox\//g, '');
    clean = clean.replace(/\/home\/container\//g, '');
    clean = clean.replace(/\/home\/runner\//g, '');
    clean = clean.replace(/\/tmp\/[a-zA-Z0-9_/-]+/g, 'solution');

    clean = clean.replace(/prog\.py/g, 'solution.py');
    clean = clean.replace(/prog\.cc/g, 'solution.cpp');
    clean = clean.replace(/prog\.cpp/g, 'solution.cpp');
    clean = clean.replace(/prog\.c/g, 'solution.c');
    clean = clean.replace(/prog\.js/g, 'solution.js');

    return clean.slice(0, 200).trim();
}

async function evaluateCode(code, language, testCases = [], exampleInput = "", exampleOutput = "") {
    const results = [];
    let overallPassed = true;

    const allCases = [];
    if (exampleInput || exampleOutput) {
        allCases.push({ input: exampleInput, output: exampleOutput, isHidden: false });
    }
    testCases.forEach(tc => {
        allCases.push({ input: tc.input, output: tc.output, isHidden: tc.isHidden ?? true });
    });

    if (allCases.length === 0) {
        return { status: 'Accepted', testCaseResults: [{ caseIndex: 1, status: 'Passed', message: 'No test cases defined. Passed by default.', output: '', expected: '', stdout: '' }] };
    }

    if (code.length < 15 || (code.includes('return false') && code.length < 50)) {
        return {
            status: 'Wrong Answer',
            testCaseResults: allCases.map((tc, idx) => ({
                caseIndex: idx + 1,
                status: 'Failed',
                message: 'Trivial or placeholder solution detected.',
                output: '',
                expected: tc.output,
                stdout: ''
            }))
        };
    }

    for (let i = 0; i < allCases.length; i++) {
        const tc = allCases[i];

        if (i > 0) {
            await sleep(1200);
        }

        try {
            const data = await executeWandbox(language, code, tc.input);

            if (data.compiler_error || (data.status !== "0" && !data.program_error && data.compiler_output)) {
                const compileErr = data.compiler_error || data.compiler_output;
                if (compileErr) {
                    overallPassed = false;
                    results.push({
                        caseIndex: i + 1,
                        status: 'Runtime Error',
                        message: sanitizeError(compileErr),
                        output: '',
                        expected: tc.output.toString().trim(),
                        stdout: ''
                    });
                    continue;
                }
            }

            if (data.signal) {
                overallPassed = false;
                results.push({
                    caseIndex: i + 1,
                    status: 'Time Limit Exceeded',
                    message: `Time Limit Exceeded (2.0s). Process terminated with signal ${data.signal}.`,
                    output: '',
                    expected: tc.output.toString().trim(),
                    stdout: ''
                });
                continue;
            }

            if (data.status !== "0") {
                overallPassed = false;
                const runtimeErr = data.program_error || data.program_output || 'Execution failed.';
                results.push({
                    caseIndex: i + 1,
                    status: 'Runtime Error',
                    message: sanitizeError(runtimeErr),
                    output: '',
                    expected: tc.output.toString().trim(),
                    stdout: ''
                });
                continue;
            }

            const finalOutput = data.program_output ? data.program_output.trim() : '';
            const expected = tc.output.toString().trim();

            const isMatch = finalOutput === expected ||
                            finalOutput.replace(/\s+/g, '') === expected.replace(/\s+/g, '');

            if (isMatch) {
                results.push({
                    caseIndex: i + 1,
                    status: 'Passed',
                    message: `Test case ${i + 1} matched.`,
                    output: finalOutput,
                    expected: expected,
                    stdout: finalOutput
                });
            } else {
                overallPassed = false;
                results.push({
                    caseIndex: i + 1,
                    status: 'Failed',
                    message: `Output mismatch. Expected: "${expected.slice(0, 40)}", Got: "${finalOutput.slice(0, 40)}"`,
                    output: finalOutput,
                    expected: expected,
                    stdout: finalOutput
                });
            }

        } catch (err) {
            overallPassed = false;
            results.push({
                caseIndex: i + 1,
                status: 'Runtime Error',
                message: `Execution pipeline failure: ${err.message}`,
                output: '',
                expected: tc.output.toString().trim(),
                stdout: ''
            });
        }
    }

    return {
        status: overallPassed ? 'Accepted' : 'Wrong Answer',
        testCaseResults: results
    };
}

export { sleep, executeWandbox, sanitizeError, evaluateCode };
