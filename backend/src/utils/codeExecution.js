const PISTON_URL = process.env.PISTON_URL || 'http://localhost:2000';

async function executePiston(language, code, stdin) {
  // Map our language names to Piston aliases
  const pistonLangs = {
    'C++': { language: 'c++', version: '*' },
    'C': { language: 'c', version: '*' },
    'Python': { language: 'python', version: '*' },
    'JavaScript': { language: 'javascript', version: '*' }
  };
  
  const langConfig = pistonLangs[language];
  if (!langConfig) throw new Error(`Unsupported language: ${language}`);

  const response = await fetch(`${PISTON_URL}/api/v2/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: langConfig.language,
      version: langConfig.version,
      files: [{ content: code }],
      stdin: stdin || ''
    }),
  });

  if (!response.ok) {
    throw new Error(`Piston returned status ${response.status}`);
  }

  const result = await response.json();
  
  // Map Piston response to the status format evaluateCode expects
  return {
    stdout: Buffer.from(result.run.stdout || '').toString('base64'),
    stderr: Buffer.from(result.run.stderr || '').toString('base64'),
    compile_output: Buffer.from(result.compile?.stderr || '').toString('base64'),
    status: {
      id: result.compile?.code !== 0 && result.compile?.stderr ? 6 : (result.run.code !== 0 ? 11 : 3)
    },
    time: "0.1"
  };
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

  clean = clean.replace(/\/box\/[a-zA-Z0-9_/-]*/g, 'solution');
  clean = clean.replace(/\/tmp\/[a-zA-Z0-9_/-]+/g, 'solution');

  clean = clean.replace(/prog\.py/g, 'solution.py');
  clean = clean.replace(/prog\.cc/g, 'solution.cpp');
  clean = clean.replace(/prog\.cpp/g, 'solution.cpp');
  clean = clean.replace(/prog\.c/g, 'solution.c');
  clean = clean.replace(/prog\.js/g, 'solution.js');
  clean = clean.replace(/script\.js/g, 'solution.js');

  return clean.slice(0, 200).trim();
}

function decodeBase64(str) {
  if (!str) return '';
  try {
    return Buffer.from(str, 'base64').toString('utf-8');
  } catch {
    return str;
  }
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

    try {
      const data = await executePiston(language, code, tc.input);

      const stdout = decodeBase64(data.stdout);
      const stderr = decodeBase64(data.stderr);
      const compileOutput = decodeBase64(data.compile_output);
      const statusId = data.status?.id;

      // 6 = Compilation Error
      if (statusId === 6) {
        overallPassed = false;
        results.push({
          caseIndex: i + 1,
          status: 'Runtime Error',
          message: sanitizeError(compileOutput),
          output: '',
          expected: tc.output.toString().trim(),
          stdout: ''
        });
        continue;
      }

      // 5 = Time Limit Exceeded
      if (statusId === 5) {
        overallPassed = false;
        results.push({
          caseIndex: i + 1,
          status: 'Time Limit Exceeded',
          message: `Time Limit Exceeded (${data.time || '5.0'}s).`,
          output: '',
          expected: tc.output.toString().trim(),
          stdout: ''
        });
        continue;
      }

      // 7-12 = Runtime errors (SIGSEGV, SIGXFSZ, SIGFPE, SIGABRT, NZEC, Other)
      if (statusId >= 7 && statusId <= 12) {
        overallPassed = false;
        results.push({
          caseIndex: i + 1,
          status: 'Runtime Error',
          message: sanitizeError(stderr || data.status?.description || 'Runtime error'),
          output: '',
          expected: tc.output.toString().trim(),
          stdout: ''
        });
        continue;
      }

      // 3 = Accepted (ran successfully)
      const finalOutput = stdout.trim();
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

export { executePiston, sanitizeError, evaluateCode };
