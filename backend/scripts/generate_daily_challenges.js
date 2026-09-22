import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Challenge from '../src/models/Challenge.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox';

// --- ROOKIE PROBLEM GENERATORS ---
const rookieTemplates = [
    // 1. Add Two Numbers
    (day) => {
        const offset = day * 7;
        const valA = 12 + (offset % 100);
        const valB = 34 + (offset % 73);
        const testCases = [];
        for (let i = 1; i <= 5; i++) {
            const a = valA + i * 13;
            const b = valB + i * 17;
            testCases.push({ input: `${a} ${b}`, output: `${a + b}`, isHidden: i > 2 });
        }
        return {
            title: `Matrix Element Summation ${day}`,
            difficulty: 'Rookie',
            tags: ['Math', 'Warmup'],
            problemStatement: `Implement a function that receives two space-separated integers, and returns their sum.\n\n### Input\n- A string containing two integers $A$ and $B$.\n\n### Output\n- Return the sum $A + B$.`,
            constraints: `0 <= A, B <= 10^4`,
            exampleInput: `${valA} ${valB}`,
            exampleOutput: `${valA + valB}`,
            testCases
        };
    },
    // 2. Even Odd Checker
    (day) => {
        const testVal = 10 + day;
        const testCases = [];
        for (let i = 1; i <= 6; i++) {
            const num = testVal + i * 19;
            testCases.push({ input: `${num}`, output: num % 2 === 0 ? 'EVEN' : 'ODD', isHidden: i > 2 });
        }
        return {
            title: `Parity Telemetry Validator ${day}`,
            difficulty: 'Rookie',
            tags: ['Conditionals', 'Math'],
            problemStatement: `Receive an integer and determine its parity. Return the string \`EVEN\` if the number is even, or \`ODD\` if the number is odd.\n\n### Input\n- An integer $N$.\n\n### Output\n- \`EVEN\` or \`ODD\`.`,
            constraints: `-10^6 <= N <= 10^6`,
            exampleInput: `${testVal}`,
            exampleOutput: testVal % 2 === 0 ? 'EVEN' : 'ODD',
            testCases
        };
    },
    // 3. Vowel Counter
    (day) => {
        const words = ['cyber', 'grid', 'sensor', 'pulse', 'circuit', 'node', 'veritabox', 'forge', 'nexus', 'protocol'];
        const word = words[day % words.length] + 'z' + day;
        const countVowels = (str) => (str.match(/[aeiou]/gi) || []).length;
        const testCases = [];
        const samples = ['aerodynamics', 'telemetry', 'vector', 'qubit', 'silicon', 'matrix', 'terminal'];
        samples.forEach((s, idx) => {
            const customWord = s + day;
            testCases.push({ input: customWord, output: `${countVowels(customWord)}`, isHidden: idx > 2 });
        });
        return {
            title: `Vowel Resonance Decoder ${day}`,
            difficulty: 'Rookie',
            tags: ['Strings', 'Algorithms'],
            problemStatement: `Identify the number of lowercase English vowels (\`a\`, \`e\`, \`i\`, \`o\`, \`u\`) present in the input string.\n\n### Input\n- A single word string $S$.\n\n### Output\n- An integer representing the count of vowels.`,
            constraints: `1 <= S.length <= 100`,
            exampleInput: word,
            exampleOutput: `${countVowels(word)}`,
            testCases
        };
    },
    // 4. Celsius to Fahrenheit
    (day) => {
        const tempC = -10 + (day % 60);
        const toF = (c) => Math.round(c * 1.8 + 32);
        const testCases = [];
        for (let i = 0; i < 5; i++) {
            const c = tempC + i * 8;
            testCases.push({ input: `${c}`, output: `${toF(c)}`, isHidden: i > 2 });
        }
        return {
            title: `Thermal Grid Calibration ${day}`,
            difficulty: 'Rookie',
            tags: ['Math', 'Physics'],
            problemStatement: `Convert a Celsius temperature value to Fahrenheit. Round the final value to the nearest integer.\n\nFormula: $F = C \\times 1.8 + 32$\n\n### Input\n- An integer temperature in Celsius.\n\n### Output\n- The integer equivalent in Fahrenheit.`,
            constraints: `-273 <= C <= 1000`,
            exampleInput: `${tempC}`,
            exampleOutput: `${toF(tempC)}`,
            testCases
        };
    }
];

// --- OPERATIVE PROBLEM GENERATORS ---
const operativeTemplates = [
    // 1. Fibonacci Number
    (day) => {
        const nIndex = 5 + (day % 15);
        const getFib = (n) => {
            let a = 0, b = 1;
            for (let i = 2; i <= n; i++) {
                let temp = a + b;
                a = b;
                b = temp;
            }
            return n === 0 ? 0 : b;
        };
        const testCases = [];
        for (let i = 0; i < 5; i++) {
            const index = nIndex + i;
            testCases.push({ input: `${index}`, output: `${getFib(index)}`, isHidden: i > 1 });
        }
        return {
            title: `Fibonacci Sequence Indexer ${day}`,
            difficulty: 'Operative',
            tags: ['Recursion', 'Dynamic Programming'],
            problemStatement: `Calculate the $N$-th Fibonacci number. The sequence begins as: $F(0) = 0, F(1) = 1, F(2) = 1, F(3) = 2, \\dots$\n\n### Input\n- An integer $N$.\n\n### Output\n- The $N$-th Fibonacci integer value.`,
            constraints: `0 <= N <= 30`,
            exampleInput: `${nIndex}`,
            exampleOutput: `${getFib(nIndex)}`,
            testCases
        };
    },
    // 2. Prime Number Validator
    (day) => {
        const val = 17 + day;
        const isPrime = (num) => {
            if (num <= 1) return false;
            for (let i = 2; i <= Math.sqrt(num); i++) {
                if (num % i === 0) return false;
            }
            return true;
        };
        const testCases = [];
        for (let i = 0; i < 6; i++) {
            const check = val + i * 3;
            testCases.push({ input: `${check}`, output: isPrime(check) ? 'PRIME' : 'COMPOSITE', isHidden: i > 2 });
        }
        return {
            title: `Prime Sentinel Verification ${day}`,
            difficulty: 'Operative',
            tags: ['Math', 'Algorithms'],
            problemStatement: `Check if a given integer is prime. Return \`PRIME\` if it has no positive divisors other than 1 and itself, otherwise return \`COMPOSITE\`.\n\n### Input\n- An integer $N$.\n\n### Output\n- \`PRIME\` or \`COMPOSITE\`.`,
            constraints: `2 <= N <= 10^7`,
            exampleInput: `${val}`,
            exampleOutput: isPrime(val) ? 'PRIME' : 'COMPOSITE',
            testCases
        };
    },
    // 3. String Word Reversal
    (day) => {
        const testPhrases = [
            'grid matrix bypass protocol',
            'veritabox software core online',
            'cyber nodes linking signal',
            'tactical operation core status'
        ];
        const phrase = testPhrases[day % testPhrases.length] + ` ${day}`;
        const reverseWords = (str) => str.split(' ').reverse().join(' ');
        const testCases = [];
        const options = [
            'qubit quantum computation platform',
            'esp32 wifi stack connection established',
            'matrix rotators running at full capacity',
            'founder node system reboot complete'
        ];
        options.forEach((o, idx) => {
            const p = o + ` ${day}`;
            testCases.push({ input: p, output: reverseWords(p), isHidden: idx > 1 });
        });
        return {
            title: `Sub-sector Word Reversion ${day}`,
            difficulty: 'Operative',
            tags: ['Strings', 'Bypass'],
            problemStatement: `Given a string of space-separated words, reverse the order of the words. Preserve original space counts.\n\n### Input\n- A string $S$ containing words.\n\n### Output\n- The reversed string.`,
            constraints: `1 <= S.length <= 500`,
            exampleInput: phrase,
            exampleOutput: reverseWords(phrase),
            testCases
        };
    },
    // 4. Array Prefix Sums
    (day) => {
        const length = 4 + (day % 4);
        const testArr = [];
        for (let i = 1; i <= length; i++) {
            testArr.push(i * 3 + (day % 7));
        }
        const getPrefixSums = (arr) => {
            const res = [];
            let sum = 0;
            arr.forEach(x => {
                sum += x;
                res.push(sum);
            });
            return res.join(' ');
        };
        const testCases = [];
        for (let i = 0; i < 5; i++) {
            const arr = [];
            for (let j = 1; j <= length + i; j++) {
                arr.push(j * 4 + i);
            }
            testCases.push({ input: arr.join(' '), output: getPrefixSums(arr), isHidden: i > 2 });
        }
        return {
            title: `Telemetry Prefix Integration ${day}`,
            difficulty: 'Operative',
            tags: ['Arrays', 'Math'],
            problemStatement: `Given an array of space-separated integers, compute its running prefix sums and return them as a space-separated string.\n\nExample: \`1 2 3\` -> \`1 3 6\`\n\n### Input\n- A space-separated list of integers.\n\n### Output\n- The prefix sums as space-separated integers.`,
            constraints: `1 <= N <= 10^3`,
            exampleInput: testArr.join(' '),
            exampleOutput: getPrefixSums(testArr),
            testCases
        };
    }
];

// --- ELITE PROBLEM GENERATORS ---
const eliteTemplates = [
    // 1. Run Length Encoder
    (day) => {
        const chars = ['a', 'b', 'c', 'd', 'e'];
        const seedStr = chars[day % 5].repeat(3) + chars[(day + 1) % 5].repeat(2) + chars[(day + 2) % 5].repeat(4);
        const rle = (str) => {
            let res = '';
            let count = 1;
            for (let i = 0; i < str.length; i++) {
                if (str[i] === str[i + 1]) {
                    count++;
                } else {
                    res += str[i] + count;
                    count = 1;
                }
            }
            return res;
        };
        const testCases = [];
        const options = ['aaaaabbbcccccd', 'wwwwwxxyyyzzzz', 'abcdefg', 'aaaaaa'];
        options.forEach((o, idx) => {
            testCases.push({ input: o, output: rle(o), isHidden: idx > 1 });
        });
        return {
            title: `Lossless Signal Compression ${day}`,
            difficulty: 'Elite',
            tags: ['Strings', 'Algorithms', 'Encryption'],
            problemStatement: `Implement basic Run-Length Encoding (RLE) to compress a string of lowercase letters. Replace consecutive duplicate characters with the character and its frequency.\n\nExample: \`aaabb\` -> \`a3b2\`\n\n### Input\n- A string $S$ of characters.\n\n### Output\n- The compressed string.`,
            constraints: `1 <= S.length <= 10^4`,
            exampleInput: seedStr,
            exampleOutput: rle(seedStr),
            testCases
        };
    },
    // 2. Bracket Sequence Validator
    (day) => {
        const valSequence = '()[]{}';
        const isValidBrackets = (str) => {
            const stack = [];
            const map = { ')': '(', ']': '[', '}': '{' };
            for (let c of str) {
                if (map[c]) {
                    if (stack.pop() !== map[c]) return 'INVALID';
                } else {
                    stack.push(c);
                }
            }
            return stack.length === 0 ? 'VALID' : 'INVALID';
        };
        const testCases = [
            { input: '()', output: 'VALID', isHidden: false },
            { input: '()[]{}', output: 'VALID', isHidden: false },
            { input: '(]', output: 'INVALID', isHidden: false },
            { input: '([)]', output: 'INVALID', isHidden: true },
            { input: '{[]}', output: 'VALID', isHidden: true },
            { input: '(((({}))))', output: 'VALID', isHidden: true }
        ];
        return {
            title: `Syntax Bracket Matrix Shield ${day}`,
            difficulty: 'Elite',
            tags: ['Stacks', 'Data Structures'],
            problemStatement: `Determine if an input string of brackets is valid. Brackets must close in correct hierarchical order.\n\nBrackets allowed: \`()\`, \`[]\`, \`{}\`.\n\n### Input\n- A string $S$ containing brackets.\n\n### Output\n- \`VALID\` or \`INVALID\`.`,
            constraints: `0 <= S.length <= 10^3`,
            exampleInput: valSequence,
            exampleOutput: 'VALID',
            testCases
        };
    },
    // 3. Collatz Conjecture Steps
    (day) => {
        const num = 12 + (day % 40);
        const collatz = (n) => {
            let steps = 0;
            let current = n;
            while (current > 1) {
                if (current % 2 === 0) current /= 2;
                else current = current * 3 + 1;
                steps++;
            }
            return steps;
        };
        const testCases = [];
        for (let i = 0; i < 5; i++) {
            const check = num + i * 5;
            testCases.push({ input: `${check}`, output: `${collatz(check)}`, isHidden: i > 1 });
        }
        return {
            title: `Collatz Convergence Calculation ${day}`,
            difficulty: 'Elite',
            tags: ['Math', 'Loops'],
            problemStatement: `Given an integer $N$, count how many steps it takes to reach $1$ using the Collatz Conjecture rules:\n- If $N$ is even: $N \\to N / 2$\n- If $N$ is odd: $N \\to 3N + 1$\n\n### Input\n- An integer $N$.\n\n### Output\n- The integer count of steps.`,
            constraints: `1 <= N <= 10^6`,
            exampleInput: `${num}`,
            exampleOutput: `${collatz(num)}`,
            testCases
        };
    },
    // 4. Target Sum Pair Matcher
    (day) => {
        const target = 15 + (day % 20);
        const numsArr = [2, 5, 8, 10, 12, 18];
        const hasPair = (arr, t) => {
            const set = new Set();
            for (let x of arr) {
                if (set.has(t - x)) return 'YES';
                set.add(x);
            }
            return 'NO';
        };
        const testCases = [];
        const options = [
            { arr: [1, 2, 3, 9], t: 8 },
            { arr: [1, 2, 4, 4], t: 8 },
            { arr: [5, 12, 3, 1], t: 15 },
            { arr: [10, 20, 30, 40], t: 50 },
            { arr: [7, 14, 21, 28], t: 35 }
        ];
        options.forEach((opt, idx) => {
            testCases.push({ input: `${opt.t} | ${opt.arr.join(' ')}`, output: hasPair(opt.arr, opt.t), isHidden: idx > 1 });
        });
        return {
            title: `Target Sum Array Resonance ${day}`,
            difficulty: 'Elite',
            tags: ['Hashing', 'Search'],
            problemStatement: `Given a target sum $T$ and a list of space-separated integers, determine if there exists a pair of integers that sum to exactly $T$. Return \`YES\` or \`NO\`.\n\nInput format: \`TargetSum | Int1 Int2 Int3...\`\n\n### Input\n- A string in format \`T | list\`.\n\n### Output\n- \`YES\` or \`NO\`.`,
            constraints: `1 <= ListSize <= 10^4`,
            exampleInput: `${target} | ${numsArr.join(' ')}`,
            exampleOutput: hasPair(numsArr, target),
            testCases
        };
    }
];

const seedDailyChallenges = async () => {
    try {
        console.log('⚡ Connecting to MongoDB for daily challenge seeder...');
        await mongoose.connect(MONGO_URI);
        console.log('🧹 Purging existing challenge catalogs...');
        await Challenge.deleteMany({});
        console.log('✨ Generating 1,095 daily challenge matrices...');

        const challengesList = [];
        const baseDate = new Date();
        // Set base date to start today at 00:00:00
        baseDate.setHours(0, 0, 0, 0);

        for (let day = 0; day < 365; day++) {
            // Compute activeFrom for this specific day
            const activeFromDate = new Date(baseDate.getTime() + day * 24 * 60 * 60 * 1000);

            // Generate 3 challenges for this day (1 Rookie, 1 Operative, 1 Elite)
            const rookie = rookieTemplates[day % rookieTemplates.length](day);
            const operative = operativeTemplates[day % operativeTemplates.length](day);
            const elite = eliteTemplates[day % eliteTemplates.length](day);

            // Assign release dates
            rookie.activeFrom = activeFromDate;
            operative.activeFrom = activeFromDate;
            elite.activeFrom = activeFromDate;

            // Set reputation rewards depending on difficulty
            rookie.reputationReward = 50;
            operative.reputationReward = 100;
            elite.reputationReward = 200;

            challengesList.push(rookie, operative, elite);
        }

        console.log(`📤 Uploading ${challengesList.length} challenges to the database...`);
        const result = await Challenge.insertMany(challengesList);
        console.log(`🎉 Successfully seeded ${result.length} challenges mapped for 1 full year!`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Challenge generation failed:', err);
        process.exit(1);
    }
};

seedDailyChallenges();
