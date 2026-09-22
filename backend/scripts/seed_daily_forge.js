import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import Challenge from '../src/models/Challenge.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox';
const START_DATE = new Date('2026-09-17T00:00:00Z');

// Difficulty schedule per day
// Days 1-60: [R,R,R]  Days 61-90: [R,R,O]  Days 91-120: [R,O,O]
// Days 121-210: [O,O,O]  Days 211-270: [O,O,E]  Days 271-330: [O,E,E]  Days 331-365: [E,E,E]
function getDayDifficulties(day) {
  if (day <= 60) return ['Rookie','Rookie','Rookie'];
  if (day <= 90) return ['Rookie','Rookie','Operative'];
  if (day <= 120) return ['Rookie','Operative','Operative'];
  if (day <= 210) return ['Operative','Operative','Operative'];
  if (day <= 270) return ['Operative','Operative','Elite'];
  if (day <= 330) return ['Operative','Elite','Elite'];
  return ['Elite','Elite','Elite'];
}

const REP = { Rookie: 25, Operative: 50, Elite: 100 };

// Helper to build a problem object
function P(title, diff, tags, ps, constraints, ei, eo, testCases) {
  return {
    title, difficulty: diff, tags,
    problemStatement: ps, constraints,
    exampleInput: ei, exampleOutput: eo,
    testCases: testCases.map((tc, i) => ({
      input: tc[0], output: tc[1], isHidden: i > 0
    })),
    reputationReward: REP[diff]
  };
}

// ========================================================================
//  ALL 1095 PROBLEMS — organized by difficulty pool
// ========================================================================

const ROOKIE = [
  // ---- BASIC MATH (1-30) ----
  P("Sum of Two","Rookie",["math","basics"],
    "Given two integers `a` and `b`, print their sum.",
    "−10^9 ≤ a, b ≤ 10^9",
    "3 5","8",
    [["3 5","8"],["0 0","0"],["-5 10","5"],["1000000000 999999999","1999999999"]]),

  P("Product Parity","Rookie",["math"],
    "Given two integers, print `Even` if their product is even, otherwise print `Odd`.",
    "1 ≤ a, b ≤ 10^6",
    "3 4","Even",
    [["3 4","Even"],["5 7","Odd"],["2 2","Even"],["1 1","Odd"]]),

  P("Absolute Difference","Rookie",["math"],
    "Given two integers `a` and `b`, print the absolute value of `a - b`.",
    "−10^9 ≤ a, b ≤ 10^9",
    "10 3","7",
    [["10 3","7"],["3 10","7"],["5 5","0"],["-4 6","10"]]),

  P("Celsius to Fahrenheit","Rookie",["math","simulation"],
    "Given a temperature in Celsius `C`, convert it to Fahrenheit using `F = C × 9/5 + 32`. Print the result rounded to 2 decimal places.",
    "−100 ≤ C ≤ 1000",
    "100","212.00",
    [["100","212.00"],["0","32.00"],["-40","-40.00"],["37","98.60"]]),

  P("Last Digit","Rookie",["math"],
    "Given a non-negative integer `N`, print its last digit.",
    "0 ≤ N ≤ 10^18",
    "12345","5",
    [["12345","5"],["0","0"],["10","0"],["7","7"]]),

  P("Count Digits","Rookie",["math","strings"],
    "Given a positive integer `N`, print the number of digits in it.",
    "1 ≤ N ≤ 10^18",
    "12345","5",
    [["12345","5"],["1","1"],["100","3"],["999999999","9"]]),

  P("Leap Year Check","Rookie",["math","conditionals"],
    "Given a year `Y`, print `Yes` if it's a leap year, otherwise `No`. A year is leap if divisible by 4 but not by 100, unless also divisible by 400.",
    "1 ≤ Y ≤ 9999",
    "2024","Yes",
    [["2024","Yes"],["1900","No"],["2000","Yes"],["2023","No"]]),

  P("Triangle Validity","Rookie",["math","geometry"],
    "Given three side lengths `a`, `b`, `c`, print `Valid` if they can form a triangle (sum of any two sides > third), else `Invalid`.",
    "1 ≤ a, b, c ≤ 10^6",
    "3 4 5","Valid",
    [["3 4 5","Valid"],["1 2 3","Invalid"],["5 5 5","Valid"],["1 1 10","Invalid"]]),

  P("Power of Two","Rookie",["math","bit-manipulation"],
    "Given a positive integer `N`, print `Yes` if it is a power of 2, else `No`.",
    "1 ≤ N ≤ 10^18",
    "16","Yes",
    [["16","Yes"],["15","No"],["1","Yes"],["1024","Yes"],["6","No"]]),

  P("Quadrant Finder","Rookie",["math","geometry"],
    "Given coordinates `(x, y)` where neither is zero, print which quadrant the point lies in (1, 2, 3, or 4).",
    "−10^6 ≤ x, y ≤ 10^6; x ≠ 0; y ≠ 0",
    "3 5","1",
    [["3 5","1"],["-2 4","2"],["-1 -1","3"],["7 -3","4"]]),

  P("Sum of Digits","Rookie",["math","loops"],
    "Given a non-negative integer `N`, print the sum of its digits.",
    "0 ≤ N ≤ 10^18",
    "1234","10",
    [["1234","10"],["0","0"],["999","27"],["100001","2"]]),

  P("Factorial","Rookie",["math","loops"],
    "Given a non-negative integer `N` (N ≤ 20), print `N!`.",
    "0 ≤ N ≤ 20",
    "5","120",
    [["5","120"],["0","1"],["1","1"],["10","3628800"],["20","2432902008176640000"]]),

  P("GCD of Two Numbers","Rookie",["math","number-theory"],
    "Given two positive integers `a` and `b`, print their Greatest Common Divisor.",
    "1 ≤ a, b ≤ 10^9",
    "12 8","4",
    [["12 8","4"],["7 13","1"],["100 100","100"],["36 48","12"]]),

  P("LCM of Two Numbers","Rookie",["math","number-theory"],
    "Given two positive integers `a` and `b`, print their Least Common Multiple.",
    "1 ≤ a, b ≤ 10^6",
    "4 6","12",
    [["4 6","12"],["3 7","21"],["5 5","5"],["12 18","36"]]),

  P("Reverse a Number","Rookie",["math","loops"],
    "Given a positive integer `N`, print it with its digits reversed. Leading zeros after reversal should be dropped.",
    "1 ≤ N ≤ 10^9",
    "12300","321",
    [["12300","321"],["5","5"],["1000","1"],["123456789","987654321"]]),

  P("Armstrong Number","Rookie",["math"],
    "Given a positive integer `N`, print `Yes` if it is an Armstrong number (sum of each digit raised to the power of total digits equals N), else `No`.",
    "1 ≤ N ≤ 10^9",
    "153","Yes",
    [["153","Yes"],["370","Yes"],["123","No"],["9474","Yes"],["10","No"]]),

  P("Perfect Number","Rookie",["math","number-theory"],
    "A perfect number equals the sum of its proper divisors. Given `N`, print `Yes` if perfect, else `No`.",
    "2 ≤ N ≤ 10^7",
    "28","Yes",
    [["28","Yes"],["6","Yes"],["12","No"],["496","Yes"],["10","No"]]),

  P("Fibonacci Term","Rookie",["math","dp-basics"],
    "Given `N`, print the Nth Fibonacci number (0-indexed: F(0)=0, F(1)=1).",
    "0 ≤ N ≤ 50",
    "10","55",
    [["10","55"],["0","0"],["1","1"],["20","6765"],["45","1134903170"]]),

  P("Prime Check","Rookie",["math","number-theory"],
    "Given a positive integer `N`, print `Yes` if it is prime, else `No`.",
    "1 ≤ N ≤ 10^9",
    "17","Yes",
    [["17","Yes"],["1","No"],["2","Yes"],["100","No"],["999999937","Yes"]]),

  P("Divisor Count","Rookie",["math","number-theory"],
    "Given `N`, print the total number of positive divisors of `N`.",
    "1 ≤ N ≤ 10^9",
    "12","6",
    [["12","6"],["1","1"],["7","2"],["36","9"],["100","9"]]),

  P("Sum of Divisors","Rookie",["math"],
    "Given `N`, print the sum of all positive divisors of `N` (including 1 and N).",
    "1 ≤ N ≤ 10^6",
    "12","28",
    [["12","28"],["1","1"],["6","12"],["28","56"]]),

  P("Digital Root","Rookie",["math"],
    "Repeatedly sum the digits of `N` until you get a single digit. Print that digit.",
    "1 ≤ N ≤ 10^18",
    "9875","2",
    [["9875","2"],["1","1"],["99","9"],["123456789","9"],["38","2"]]),

  P("Binary Representation","Rookie",["math","bit-manipulation"],
    "Given a non-negative integer `N`, print its binary representation (no leading zeros, except for 0 itself).",
    "0 ≤ N ≤ 10^9",
    "10","1010",
    [["10","1010"],["0","0"],["1","1"],["255","11111111"],["1024","10000000000"]]),

  P("Trailing Zeros in Factorial","Rookie",["math","number-theory"],
    "Given `N`, count the number of trailing zeros in `N!`.",
    "0 ≤ N ≤ 10^9",
    "25","6",
    [["25","6"],["5","1"],["0","0"],["100","24"],["1000000000","249999998"]]),

  P("Nth Triangular Number","Rookie",["math"],
    "The Nth triangular number is `N*(N+1)/2`. Given `N`, print it.",
    "1 ≤ N ≤ 10^9",
    "5","15",
    [["5","15"],["1","1"],["10","55"],["100","5050"],["1000000","500000500000"]]),

  P("Maximum of Three","Rookie",["math","conditionals"],
    "Given three integers, print the maximum.",
    "−10^9 ≤ a, b, c ≤ 10^9",
    "3 7 2","7",
    [["3 7 2","7"],["-1 -5 -3","-1"],["0 0 0","0"],["100 100 99","100"]]),

  P("Even or Odd Sum","Rookie",["math"],
    "Given `N` integers, print the sum of all even numbers and the sum of all odd numbers, space-separated.",
    "1 ≤ N ≤ 10^5; |a_i| ≤ 10^6",
    "5\n1 2 3 4 5","6 9",
    [["5\n1 2 3 4 5","6 9"],["3\n2 4 6","12 0"],["1\n7","0 7"],["4\n-2 -3 4 5","2 2"]]),

  P("Integer Division Floor","Rookie",["math"],
    "Given two integers `a` and `b` (b ≠ 0), print the floor of `a / b`.",
    "−10^9 ≤ a ≤ 10^9; −10^9 ≤ b ≤ 10^9; b ≠ 0",
    "7 2","3",
    [["7 2","3"],["-7 2","-4"],["10 3","3"],["0 5","0"],["-1 -1","1"]]),

  P("Collatz Steps","Rookie",["math","simulation"],
    "Starting from `N`, if even divide by 2, if odd multiply by 3 and add 1. Repeat until you reach 1. Print the number of steps.",
    "1 ≤ N ≤ 10^6",
    "6","8",
    [["6","8"],["1","0"],["27","111"],["10","6"]]),

  P("Number Palindrome","Rookie",["math","strings"],
    "Given a positive integer `N`, print `Yes` if it reads the same forwards and backwards, else `No`.",
    "1 ≤ N ≤ 10^18",
    "12321","Yes",
    [["12321","Yes"],["123","No"],["1","Yes"],["1001","Yes"],["10","No"]]),

  // ---- STRING BASICS (31-60) ----
  P("String Length","Rookie",["strings","basics"],
    "Given a string `S`, print its length.",
    "1 ≤ |S| ≤ 10^5",
    "hello","5",
    [["hello","5"],["a","1"],["competitive programming","23"]]),

  P("Reverse String","Rookie",["strings"],
    "Given a string `S`, print it reversed.",
    "1 ≤ |S| ≤ 10^5",
    "hello","olleh",
    [["hello","olleh"],["a","a"],["abcdef","fedcba"],["racecar","racecar"]]),

  P("Uppercase Conversion","Rookie",["strings"],
    "Given a string `S` of lowercase English letters, print it in uppercase.",
    "1 ≤ |S| ≤ 10^5; S contains only lowercase letters",
    "hello","HELLO",
    [["hello","HELLO"],["abc","ABC"],["z","Z"]]),

  P("Count Vowels","Rookie",["strings","counting"],
    "Given a string `S` (case-insensitive), print the number of vowels (a, e, i, o, u).",
    "1 ≤ |S| ≤ 10^5",
    "Hello World","3",
    [["Hello World","3"],["aeiou","5"],["xyz","0"],["AEIOU","5"]]),

  P("Character Frequency","Rookie",["strings","hashing"],
    "Given a string `S` of lowercase letters and a character `c`, print how many times `c` appears in `S`.",
    "1 ≤ |S| ≤ 10^5",
    "banana\na","3",
    [["banana\na","3"],["hello\nz","0"],["aaaa\na","4"]]),

  P("String Palindrome","Rookie",["strings"],
    "Given a string `S` of lowercase letters, print `Yes` if it's a palindrome, else `No`.",
    "1 ≤ |S| ≤ 10^5",
    "racecar","Yes",
    [["racecar","Yes"],["hello","No"],["a","Yes"],["abba","Yes"],["abc","No"]]),

  P("Toggle Case","Rookie",["strings"],
    "Given a string `S`, toggle the case of each letter (upper→lower, lower→upper). Non-letters stay unchanged.",
    "1 ≤ |S| ≤ 10^5",
    "Hello World","hELLO wORLD",
    [["Hello World","hELLO wORLD"],["ABC","abc"],["123","123"],["aB1c","Ab1C"]]),

  P("Remove Spaces","Rookie",["strings"],
    "Given a string `S`, print it with all spaces removed.",
    "1 ≤ |S| ≤ 10^5",
    "hello world","helloworld",
    [["hello world","helloworld"],["  a  b  ","ab"],["nospace","nospace"]]),

  P("First Non-Repeating Character","Rookie",["strings","hashing"],
    "Given a string `S` of lowercase letters, print the first character that appears exactly once. If none, print `-1`.",
    "1 ≤ |S| ≤ 10^5",
    "aabcbd","c",
    [["aabcbd","c"],["aabb","-1"],["abcabc","-1"],["abcdef","a"]]),

  P("Anagram Check","Rookie",["strings","sorting"],
    "Given two strings `A` and `B` (lowercase letters), print `Yes` if they are anagrams of each other, else `No`.",
    "1 ≤ |A|, |B| ≤ 10^5",
    "listen\nsilent","Yes",
    [["listen\nsilent","Yes"],["hello\nworld","No"],["abc\ncba","Yes"],["ab\na","No"]]),

  P("Word Count","Rookie",["strings"],
    "Given a line of text, print the number of words (separated by single spaces, no leading/trailing spaces).",
    "1 ≤ |S| ≤ 10^5",
    "the quick brown fox","4",
    [["the quick brown fox","4"],["hello","1"],["a b c d e f","6"]]),

  P("Caesar Cipher","Rookie",["strings","crypto"],
    "Given a string `S` (lowercase letters only) and a shift `k`, shift each letter forward by `k` positions in the alphabet (wrapping from z to a). Print the result.",
    "1 ≤ |S| ≤ 10^5; 1 ≤ k ≤ 25",
    "abc\n3","def",
    [["abc\n3","def"],["xyz\n1","yza"],["hello\n13","uryyb"],["zoo\n2","bqq"]]),

  P("Substring Count","Rookie",["strings"],
    "Given a string `S` and a substring `T`, print how many times `T` appears in `S` (overlapping allowed).",
    "1 ≤ |T| ≤ |S| ≤ 10^5",
    "aaaa\naa","3",
    [["aaaa\naa","3"],["hello\nll","1"],["abcabc\nabc","2"],["aaa\nb","0"]]),

  P("Longest Word","Rookie",["strings"],
    "Given a sentence (words separated by spaces), print the length of the longest word.",
    "1 ≤ |S| ≤ 10^5",
    "the quick brown fox","5",
    [["the quick brown fox","5"],["hello","5"],["a bb ccc dddd","4"],["I am OK","2"]]),

  P("Run Length Encoding","Rookie",["strings"],
    "Given a string of lowercase letters, compress it: each group of consecutive identical characters becomes the character followed by its count.\n\nExample: `aaabbc` → `a3b2c1`",
    "1 ≤ |S| ≤ 10^5",
    "aaabbc","a3b2c1",
    [["aaabbc","a3b2c1"],["a","a1"],["aabbcc","a2b2c2"],["abcabc","a1b1c1a1b1c1"]]),

  P("Valid Parentheses Simple","Rookie",["strings","stack"],
    "Given a string containing only `(` and `)`, print `Yes` if the parentheses are balanced, else `No`.",
    "1 ≤ |S| ≤ 10^5",
    "(())","Yes",
    [["(())","Yes"],["()()","Yes"],["(()","No"],[")(","No"],["","Yes"]]),

  P("Repeated String Pattern","Rookie",["strings"],
    "Given a string `S`, print `Yes` if it can be formed by repeating a substring of itself, else `No`.\n\nExample: `abcabc` = `abc` repeated 2 times → `Yes`",
    "1 ≤ |S| ≤ 10^5",
    "abcabc","Yes",
    [["abcabc","Yes"],["abab","Yes"],["abc","No"],["aaaa","Yes"],["abcab","No"]]),

  P("Pangram Check","Rookie",["strings","hashing"],
    "Given a string `S`, print `Yes` if it contains every letter of the English alphabet at least once (case-insensitive), else `No`.",
    "1 ≤ |S| ≤ 10^5",
    "The quick brown fox jumps over the lazy dog","Yes",
    [["The quick brown fox jumps over the lazy dog","Yes"],["Hello World","No"],["abcdefghijklmnopqrstuvwxyz","Yes"]]),

  P("String Rotation Check","Rookie",["strings"],
    "Given two strings `A` and `B`, print `Yes` if `B` is a rotation of `A`, else `No`.\n\nExample: `cdeab` is a rotation of `abcde`.",
    "1 ≤ |A|, |B| ≤ 10^5",
    "abcde\ncdeab","Yes",
    [["abcde\ncdeab","Yes"],["abc\ncab","Yes"],["abc\nbca","Yes"],["abc\nabc","Yes"],["abc\nabd","No"]]),

  P("Capitalize Words","Rookie",["strings"],
    "Given a sentence of lowercase words separated by spaces, capitalize the first letter of each word. Print the result.",
    "1 ≤ |S| ≤ 10^5",
    "hello world","Hello World",
    [["hello world","Hello World"],["abc","Abc"],["the quick brown fox","The Quick Brown Fox"]]),

  P("Remove Duplicates from String","Rookie",["strings","hashing"],
    "Given a string `S` of lowercase letters, remove all duplicate characters keeping only the first occurrence of each. Print the result.",
    "1 ≤ |S| ≤ 10^5",
    "abracadabra","abrcd",
    [["abracadabra","abrcd"],["hello","helo"],["aaa","a"],["abcdef","abcdef"]]),

  P("Zigzag String","Rookie",["strings"],
    "Given a string `S` of lowercase letters, print characters at even indices (0-based) followed by characters at odd indices.",
    "1 ≤ |S| ≤ 10^5",
    "abcdef","acebdf",
    [["abcdef","acebdf"],["hello","hloel"],["a","a"],["ab","ab"]]),

  P("Vowel-Consonant Swap","Rookie",["strings"],
    "Given a string `S` of lowercase letters, replace each vowel with `*` and each consonant with `#`. Print the result.",
    "1 ≤ |S| ≤ 10^5",
    "hello","#*##*",
    [["hello","#*##*"],["aeiou","*****"],["xyz","###"]]),

  P("Mirror String","Rookie",["strings"],
    "Given a string `S`, print `S` concatenated with its reverse, separated by `|`.",
    "1 ≤ |S| ≤ 10^4",
    "abc","abc|cba",
    [["abc","abc|cba"],["a","a|a"],["hello","hello|olleh"]]),

  P("Most Frequent Character","Rookie",["strings","hashing"],
    "Given a string `S` of lowercase letters, print the character that appears most frequently. If there's a tie, print the one that comes first alphabetically.",
    "1 ≤ |S| ≤ 10^5",
    "abracadabra","a",
    [["abracadabra","a"],["aabb","a"],["zzz","z"],["bba","b"]]),

  P("String Compression Check","Rookie",["strings"],
    "Given a string `S`, check if all characters are the same. Print `Yes` or `No`.",
    "1 ≤ |S| ≤ 10^5",
    "aaaa","Yes",
    [["aaaa","Yes"],["aab","No"],["z","Yes"],["abcabc","No"]]),

  P("Hamming Distance","Rookie",["strings"],
    "Given two strings `A` and `B` of equal length, print the number of positions where they differ.",
    "1 ≤ |A| = |B| ≤ 10^5",
    "karolin\nkathrin","3",
    [["karolin\nkathrin","3"],["abc\nabc","0"],["abc\nxyz","3"]]),

  P("Reverse Words","Rookie",["strings"],
    "Given a sentence, reverse the order of words. Words are separated by single spaces.",
    "1 ≤ |S| ≤ 10^5",
    "hello world program","program world hello",
    [["hello world program","program world hello"],["abc","abc"],["a b","b a"]]),

  P("Isogram Check","Rookie",["strings","hashing"],
    "A string is an isogram if no letter appears more than once (case-insensitive). Given `S`, print `Yes` if isogram, else `No`.",
    "1 ≤ |S| ≤ 10^5; only letters",
    "algorithm","Yes",
    [["algorithm","Yes"],["hello","No"],["AbCdEf","Yes"],["a","Yes"]]),

  // ---- ARRAY BASICS (61-90) ----
  P("Array Sum","Rookie",["arrays","basics"],
    "Given an array of `N` integers, print their sum.",
    "1 ≤ N ≤ 10^5; |a_i| ≤ 10^9",
    "5\n1 2 3 4 5","15",
    [["5\n1 2 3 4 5","15"],["1\n0","0"],["3\n-1 0 1","0"],["4\n1000000000 1000000000 1000000000 1000000000","4000000000"]]),

  P("Find Maximum","Rookie",["arrays"],
    "Given an array of `N` integers, print the maximum element.",
    "1 ≤ N ≤ 10^5; |a_i| ≤ 10^9",
    "5\n3 1 4 1 5","5",
    [["5\n3 1 4 1 5","5"],["1\n42","42"],["4\n-1 -5 -3 -2","-1"]]),

  P("Find Minimum","Rookie",["arrays"],
    "Given an array of `N` integers, print the minimum element.",
    "1 ≤ N ≤ 10^5; |a_i| ≤ 10^9",
    "5\n3 1 4 1 5","1",
    [["5\n3 1 4 1 5","1"],["1\n42","42"],["4\n-1 -5 -3 -2","-5"]]),

  P("Reverse Array","Rookie",["arrays"],
    "Given an array of `N` integers, print it in reverse order (space-separated).",
    "1 ≤ N ≤ 10^5",
    "5\n1 2 3 4 5","5 4 3 2 1",
    [["5\n1 2 3 4 5","5 4 3 2 1"],["1\n9","9"],["3\n-1 0 1","1 0 -1"]]),

  P("Count Occurrences","Rookie",["arrays","counting"],
    "Given an array of `N` integers and a target `X`, print how many times `X` appears.",
    "1 ≤ N ≤ 10^5; |a_i|, |X| ≤ 10^9",
    "6 3\n1 3 3 2 3 4","3",
    [["6 3\n1 3 3 2 3 4","3"],["5 7\n1 2 3 4 5","0"],["1 1\n1","1"]]),

  P("Second Largest","Rookie",["arrays"],
    "Given an array of `N` distinct integers, print the second largest element.",
    "2 ≤ N ≤ 10^5; elements are distinct",
    "5\n3 1 5 2 4","4",
    [["5\n3 1 5 2 4","4"],["2\n1 2","1"],["4\n10 20 30 40","30"]]),

  P("Array Rotation Left","Rookie",["arrays"],
    "Given an array of `N` integers, rotate it left by `K` positions. Print the result.",
    "1 ≤ N ≤ 10^5; 0 ≤ K ≤ 10^9",
    "5 2\n1 2 3 4 5","3 4 5 1 2",
    [["5 2\n1 2 3 4 5","3 4 5 1 2"],["4 0\n1 2 3 4","1 2 3 4"],["3 3\n1 2 3","1 2 3"],["3 5\n1 2 3","3 1 2"]]),

  P("Check Sorted","Rookie",["arrays"],
    "Given an array of `N` integers, print `Yes` if it is sorted in non-decreasing order, else `No`.",
    "1 ≤ N ≤ 10^5",
    "5\n1 2 3 4 5","Yes",
    [["5\n1 2 3 4 5","Yes"],["3\n3 1 2","No"],["1\n5","Yes"],["4\n1 1 1 1","Yes"],["3\n1 3 2","No"]]),

  P("Remove Duplicates Sorted","Rookie",["arrays"],
    "Given a sorted array of `N` integers, remove duplicates and print the resulting array.",
    "1 ≤ N ≤ 10^5",
    "7\n1 1 2 2 3 3 3","1 2 3",
    [["7\n1 1 2 2 3 3 3","1 2 3"],["5\n1 1 1 1 1","1"],["4\n1 2 3 4","1 2 3 4"]]),

  P("Prefix Sum Array","Rookie",["arrays","prefix-sum"],
    "Given an array of `N` integers, print its prefix sum array where `P[i] = a[0] + a[1] + ... + a[i]`.",
    "1 ≤ N ≤ 10^5; |a_i| ≤ 10^6",
    "5\n1 2 3 4 5","1 3 6 10 15",
    [["5\n1 2 3 4 5","1 3 6 10 15"],["3\n1 -1 1","1 0 1"],["1\n5","5"]]),

  P("Pair Sum Exists","Rookie",["arrays","hashing"],
    "Given an array of `N` integers and a target sum `T`, print `Yes` if any two distinct elements sum to `T`, else `No`.",
    "2 ≤ N ≤ 10^5; |a_i|, |T| ≤ 10^9",
    "5 9\n2 7 11 15 1","Yes",
    [["5 9\n2 7 11 15 1","Yes"],["4 10\n1 2 3 4","No"],["3 0\n-5 0 5","Yes"]]),

  P("Leaders in Array","Rookie",["arrays"],
    "An element is a leader if it is strictly greater than all elements to its right. Print all leaders from left to right.",
    "1 ≤ N ≤ 10^5",
    "6\n16 17 4 3 5 2","17 5 2",
    [["6\n16 17 4 3 5 2","17 5 2"],["5\n1 2 3 4 5","5"],["3\n5 4 3","5 4 3"]]),

  P("Merge Two Sorted Arrays","Rookie",["arrays","sorting"],
    "Given two sorted arrays of sizes `M` and `N`, merge them into one sorted array and print it.",
    "1 ≤ M, N ≤ 10^5",
    "3\n1 3 5\n3\n2 4 6","1 2 3 4 5 6",
    [["3\n1 3 5\n3\n2 4 6","1 2 3 4 5 6"],["2\n1 2\n2\n3 4","1 2 3 4"],["1\n5\n1\n5","5 5"]]),

  P("Missing Number","Rookie",["arrays","math"],
    "Given an array containing `N-1` distinct integers from `1` to `N`, find the missing number.",
    "2 ≤ N ≤ 10^6",
    "5\n1 2 4 5","3",
    [["5\n1 2 4 5","3"],["3\n1 3","2"],["2\n2","1"],["6\n1 2 3 4 5","6"]]),

  P("Move Zeros to End","Rookie",["arrays"],
    "Given an array of `N` integers, move all zeros to the end while keeping the relative order of non-zero elements. Print the result.",
    "1 ≤ N ≤ 10^5",
    "5\n0 1 0 3 12","1 3 12 0 0",
    [["5\n0 1 0 3 12","1 3 12 0 0"],["3\n0 0 1","1 0 0"],["3\n1 2 3","1 2 3"]]),

  P("Equilibrium Index","Rookie",["arrays","prefix-sum"],
    "Find the smallest index `i` such that the sum of elements before `i` equals the sum after `i`. Print the index (0-based), or `-1` if none.",
    "1 ≤ N ≤ 10^5; |a_i| ≤ 10^6",
    "7\n-7 1 5 2 -4 3 0","3",
    [["7\n-7 1 5 2 -4 3 0","3"],["3\n1 2 3","-1"],["1\n5","0"],["5\n1 2 3 2 1","2"]]),

  P("Frequency of Each Element","Rookie",["arrays","hashing"],
    "Given an array of `N` positive integers (1 ≤ a_i ≤ 1000), print each distinct value and its count, sorted by value, one per line as `value count`.",
    "1 ≤ N ≤ 10^5; 1 ≤ a_i ≤ 1000",
    "7\n1 2 2 3 3 3 1","1 2\n2 2\n3 3",
    [["7\n1 2 2 3 3 3 1","1 2\n2 2\n3 3"],["3\n5 5 5","5 3"],["4\n1 2 3 4","1 1\n2 1\n3 1\n4 1"]]),

  P("Maximum Subarray Sum (Brute)","Rookie",["arrays"],
    "Given an array of `N` integers, find the maximum sum of any contiguous subarray. Print that sum.",
    "1 ≤ N ≤ 10^5; |a_i| ≤ 10^4",
    "8\n-2 1 -3 4 -1 2 1 -5","6",
    [["8\n-2 1 -3 4 -1 2 1 -5","6"],["1\n-1","-1"],["5\n1 2 3 4 5","15"],["3\n-1 -2 -3","-1"]]),

  P("Intersection of Two Arrays","Rookie",["arrays","hashing"],
    "Given two arrays, print their intersection (common elements, each appearing as many times as in both). Output should be sorted.",
    "1 ≤ N, M ≤ 10^5",
    "5\n1 2 2 3 4\n4\n2 2 4 5","2 2 4",
    [["5\n1 2 2 3 4\n4\n2 2 4 5","2 2 4"],["3\n1 2 3\n3\n4 5 6",""],["2\n1 1\n2\n1 1","1 1"]]),

  P("Majority Element","Rookie",["arrays"],
    "Given an array of `N` integers, find the element that appears more than `N/2` times. It is guaranteed to exist.",
    "1 ≤ N ≤ 10^5",
    "7\n2 2 1 1 2 2 2","2",
    [["7\n2 2 1 1 2 2 2","2"],["1\n5","5"],["5\n3 3 3 1 2","3"]]),

  P("Product Except Self","Rookie",["arrays","math"],
    "Given an array of `N` non-zero integers, for each index print the product of all other elements. Output space-separated.\n\nDo this without division.",
    "2 ≤ N ≤ 10^5; |a_i| ≤ 100",
    "4\n1 2 3 4","24 12 8 6",
    [["4\n1 2 3 4","24 12 8 6"],["3\n2 3 4","12 8 6"],["2\n5 6","6 5"]]),

  P("Smallest Missing Positive","Rookie",["arrays"],
    "Given an array of integers, find the smallest positive integer (≥ 1) that does not appear in the array.",
    "1 ≤ N ≤ 10^5; |a_i| ≤ 10^6",
    "6\n3 4 -1 1 0 2","5",
    [["6\n3 4 -1 1 0 2","5"],["3\n1 2 3","4"],["3\n7 8 9","1"],["1\n1","2"]]),

  P("Array Peaks","Rookie",["arrays"],
    "Given an array of `N` integers, print the indices (0-based) of all peak elements. A peak is strictly greater than its neighbors. First and last elements can be peaks if greater than their only neighbor.",
    "1 ≤ N ≤ 10^5",
    "7\n1 3 2 5 4 7 6","1 3 5",
    [["7\n1 3 2 5 4 7 6","1 3 5"],["1\n5","0"],["3\n1 2 1","1"],["3\n3 2 1","0"]]),

  P("Dutch National Flag","Rookie",["arrays","sorting"],
    "Given an array containing only 0s, 1s, and 2s, sort it. Print the sorted array.",
    "1 ≤ N ≤ 10^5",
    "6\n2 0 1 2 0 1","0 0 1 1 2 2",
    [["6\n2 0 1 2 0 1","0 0 1 1 2 2"],["3\n0 0 0","0 0 0"],["4\n2 2 1 1","1 1 2 2"]]),

  P("Subarray with Given Sum","Rookie",["arrays","prefix-sum"],
    "Given an array of `N` positive integers and a target sum `S`, find the first contiguous subarray that sums to `S`. Print start and end indices (1-based). If none, print `-1`.",
    "1 ≤ N ≤ 10^5; 1 ≤ a_i, S ≤ 10^9",
    "5 12\n1 2 3 7 5","2 4",
    [["5 12\n1 2 3 7 5","2 4"],["5 15\n1 2 3 4 5","1 5"],["3 100\n1 2 3","-1"]]),

  P("Stock Buy Sell Once","Rookie",["arrays","greedy"],
    "Given `N` daily stock prices, find the maximum profit from a single buy-sell transaction. If no profit is possible, print `0`.",
    "1 ≤ N ≤ 10^5; 1 ≤ price_i ≤ 10^6",
    "6\n7 1 5 3 6 4","5",
    [["6\n7 1 5 3 6 4","5"],["5\n7 6 4 3 1","0"],["2\n1 5","4"]]),

  P("Monotonic Array","Rookie",["arrays"],
    "Given an array of `N` integers, print `Yes` if it is monotonic (entirely non-increasing or non-decreasing), else `No`.",
    "1 ≤ N ≤ 10^5",
    "5\n1 2 2 3 4","Yes",
    [["5\n1 2 2 3 4","Yes"],["4\n5 3 3 1","Yes"],["3\n1 3 2","No"],["1\n7","Yes"]]),

  P("Rotate Matrix 90","Rookie",["arrays","matrix"],
    "Given an `N×N` matrix, rotate it 90 degrees clockwise. Print the result row by row.",
    "1 ≤ N ≤ 100",
    "3\n1 2 3\n4 5 6\n7 8 9","7 4 1\n8 5 2\n9 6 3",
    [["3\n1 2 3\n4 5 6\n7 8 9","7 4 1\n8 5 2\n9 6 3"],["2\n1 2\n3 4","3 1\n4 2"],["1\n5","5"]]),

  P("Spiral Matrix Print","Rookie",["arrays","matrix"],
    "Given an `M×N` matrix, print its elements in spiral order (right → down → left → up → repeat).",
    "1 ≤ M, N ≤ 100",
    "3 3\n1 2 3\n4 5 6\n7 8 9","1 2 3 6 9 8 7 4 5",
    [["3 3\n1 2 3\n4 5 6\n7 8 9","1 2 3 6 9 8 7 4 5"],["2 2\n1 2\n3 4","1 2 4 3"],["1 3\n1 2 3","1 2 3"]]),

  // ---- LOOPS, COUNTING, PATTERNS (91-120) ----
  P("N Prime Numbers","Rookie",["math","number-theory","loops"],
    "Given `N`, print the first `N` prime numbers, space-separated.",
    "1 ≤ N ≤ 1000",
    "5","2 3 5 7 11",
    [["5","2 3 5 7 11"],["1","2"],["10","2 3 5 7 11 13 17 19 23 29"]]),

  P("Multiplication Table","Rookie",["math","loops"],
    "Given `N`, print its multiplication table from 1 to 10. Each line: `N x i = result`.",
    "1 ≤ N ≤ 1000",
    "5","5 x 1 = 5\n5 x 2 = 10\n5 x 3 = 15\n5 x 4 = 20\n5 x 5 = 25\n5 x 6 = 30\n5 x 7 = 35\n5 x 8 = 40\n5 x 9 = 45\n5 x 10 = 50",
    [["5","5 x 1 = 5\n5 x 2 = 10\n5 x 3 = 15\n5 x 4 = 20\n5 x 5 = 25\n5 x 6 = 30\n5 x 7 = 35\n5 x 8 = 40\n5 x 9 = 45\n5 x 10 = 50"],["1","1 x 1 = 1\n1 x 2 = 2\n1 x 3 = 3\n1 x 4 = 4\n1 x 5 = 5\n1 x 6 = 6\n1 x 7 = 7\n1 x 8 = 8\n1 x 9 = 9\n1 x 10 = 10"]]),

  P("Sum of Series 1/1 + 1/2 + ... + 1/N","Rookie",["math","loops"],
    "Given `N`, compute the harmonic sum `H(N) = 1/1 + 1/2 + ... + 1/N`. Print the result rounded to 6 decimal places.",
    "1 ≤ N ≤ 10^6",
    "5","2.283333",
    [["5","2.283333"],["1","1.000000"],["10","2.928968"]]),

  P("Star Triangle","Rookie",["patterns","loops"],
    "Given `N`, print a right-angled triangle of `*` with `N` rows. Row `i` has `i` stars.",
    "1 ≤ N ≤ 50",
    "3","*\n**\n***",
    [["3","*\n**\n***"],["1","*"],["5","*\n**\n***\n****\n*****"]]),

  P("Diamond Pattern","Rookie",["patterns","loops"],
    "Given odd `N`, print a diamond of `*`. The widest row has `N` stars.",
    "N is odd; 1 ≤ N ≤ 49",
    "5","  *\n ***\n*****\n ***\n  *",
    [["5","  *\n ***\n*****\n ***\n  *"],["1","*"],["3"," *\n***\n *"]]),

  P("Pascal's Triangle Row","Rookie",["math","combinatorics"],
    "Given `N` (0-indexed), print the Nth row of Pascal's triangle.",
    "0 ≤ N ≤ 30",
    "4","1 4 6 4 1",
    [["4","1 4 6 4 1"],["0","1"],["1","1 1"],["5","1 5 10 10 5 1"]]),

  P("Power Without Built-in","Rookie",["math","loops"],
    "Given `base` and `exp` (both non-negative integers), compute `base^exp` without using built-in power functions. Print the result.",
    "0 ≤ base ≤ 100; 0 ≤ exp ≤ 20; result fits in 64-bit integer",
    "2 10","1024",
    [["2 10","1024"],["5 0","1"],["0 5","0"],["3 5","243"]]),

  P("Harshad Number","Rookie",["math"],
    "A Harshad number is divisible by the sum of its digits. Given `N`, print `Yes` if Harshad, else `No`.",
    "1 ≤ N ≤ 10^9",
    "18","Yes",
    [["18","Yes"],["19","No"],["1","Yes"],["100","Yes"],["21","Yes"]]),

  P("Happy Number","Rookie",["math","simulation"],
    "Starting from `N`, repeatedly replace it with the sum of squares of its digits. If it reaches 1, print `Yes` (happy). If it loops forever, print `No`.",
    "1 ≤ N ≤ 10^6",
    "19","Yes",
    [["19","Yes"],["2","No"],["7","Yes"],["4","No"],["1","Yes"]]),

  P("Abundant Number","Rookie",["math","number-theory"],
    "A number is abundant if the sum of its proper divisors exceeds the number. Given `N`, print `Yes` or `No`.",
    "2 ≤ N ≤ 10^6",
    "12","Yes",
    [["12","Yes"],["6","No"],["28","No"],["18","Yes"]]),

  P("Primes in Range","Rookie",["math","number-theory"],
    "Given `L` and `R`, print all prime numbers in the range [L, R], space-separated.",
    "2 ≤ L ≤ R ≤ 10^6",
    "10 30","11 13 17 19 23 29",
    [["10 30","11 13 17 19 23 29"],["2 10","2 3 5 7"],["20 22",""]]),

  P("Sum of Squares","Rookie",["math"],
    "Given `N`, compute `1² + 2² + ... + N²` using the formula `N*(N+1)*(2N+1)/6`. Print the result.",
    "1 ≤ N ≤ 10^6",
    "5","55",
    [["5","55"],["1","1"],["10","385"],["100","338350"]]),

  P("Number to Words (0-9)","Rookie",["conditionals"],
    "Given a single digit `N` (0-9), print its English name (e.g., 0 → \"zero\", 5 → \"five\").",
    "0 ≤ N ≤ 9",
    "5","five",
    [["5","five"],["0","zero"],["9","nine"],["1","one"]]),

  P("Neon Number","Rookie",["math"],
    "A neon number is one where the sum of digits of its square equals the number itself. Given `N`, print `Yes` or `No`.",
    "0 ≤ N ≤ 10^6",
    "9","Yes",
    [["9","Yes"],["1","Yes"],["0","Yes"],["2","No"],["10","No"]]),

  P("Strong Number","Rookie",["math"],
    "A strong number equals the sum of factorials of its digits (e.g., 145 = 1! + 4! + 5!). Given `N`, print `Yes` or `No`.",
    "1 ≤ N ≤ 10^7",
    "145","Yes",
    [["145","Yes"],["1","Yes"],["2","Yes"],["123","No"],["40585","Yes"]]),

  P("Spy Number","Rookie",["math"],
    "A spy number is one where the sum of digits equals the product of digits. Given `N`, print `Yes` or `No`.",
    "1 ≤ N ≤ 10^9",
    "1124","Yes",
    [["1124","Yes"],["123","No"],["22","Yes"],["1111","No"]]),

  P("Automorphic Number","Rookie",["math"],
    "A number `N` is automorphic if `N²` ends with `N` (e.g., 25² = 625 ends with 25). Print `Yes` or `No`.",
    "1 ≤ N ≤ 10^6",
    "25","Yes",
    [["25","Yes"],["76","Yes"],["5","Yes"],["7","No"],["6","Yes"]]),

  P("Kaprekar Number","Rookie",["math"],
    "A number `N` is Kaprekar if when `N²` is split into two parts, left + right = N. For single-digit, only 1 and 9 qualify. Given `N`, print `Yes` or `No`.\n\nExample: 45² = 2025 → 20 + 25 = 45 → Yes.",
    "1 ≤ N ≤ 10^6",
    "45","Yes",
    [["45","Yes"],["9","Yes"],["297","Yes"],["10","No"]]),

  P("Catalan Number","Rookie",["math","dp-basics"],
    "Given `N`, print the Nth Catalan number. C(0)=1, C(n) = Σ C(i)×C(n-1-i) for i=0..n-1.",
    "0 ≤ N ≤ 25",
    "5","42",
    [["5","42"],["0","1"],["1","1"],["10","16796"],["3","5"]]),

  P("Ugly Number","Rookie",["math"],
    "An ugly number has only 2, 3, and 5 as prime factors (1 is considered ugly). Given `N`, print `Yes` or `No`.",
    "1 ≤ N ≤ 10^9",
    "30","Yes",
    [["30","Yes"],["14","No"],["1","Yes"],["8","Yes"],["7","No"]]),

  P("Sum of Cubes","Rookie",["math"],
    "Given `N`, compute `1³ + 2³ + ... + N³`. Print the result.",
    "1 ≤ N ≤ 10^5",
    "3","36",
    [["3","36"],["1","1"],["5","225"],["10","3025"]]),

  P("Staircase Pattern","Rookie",["patterns"],
    "Given `N`, print a right-aligned staircase of `#` with `N` steps. Each row has leading spaces and then `#` symbols.",
    "1 ≤ N ≤ 50",
    "4","   #\n  ##\n ###\n####",
    [["4","   #\n  ##\n ###\n####"],["1","#"],["2"," #\n##"]]),

  P("GCD of Array","Rookie",["math","number-theory"],
    "Given `N` positive integers, find the GCD of all of them.",
    "1 ≤ N ≤ 10^5; 1 ≤ a_i ≤ 10^9",
    "4\n12 18 24 36","6",
    [["4\n12 18 24 36","6"],["3\n7 7 7","7"],["2\n100 75","25"],["5\n2 3 5 7 11","1"]]),

  P("Matrix Transpose","Rookie",["arrays","matrix"],
    "Given an `M×N` matrix, print its transpose (N×M).",
    "1 ≤ M, N ≤ 100",
    "2 3\n1 2 3\n4 5 6","1 4\n2 5\n3 6",
    [["2 3\n1 2 3\n4 5 6","1 4\n2 5\n3 6"],["1 1\n5","5"],["3 2\n1 2\n3 4\n5 6","1 3 5\n2 4 6"]]),

  P("Matrix Diagonal Sum","Rookie",["arrays","matrix"],
    "Given an `N×N` matrix, print the sum of both diagonals. If N is odd, don't count the center element twice.",
    "1 ≤ N ≤ 100",
    "3\n1 2 3\n4 5 6\n7 8 9","25",
    [["3\n1 2 3\n4 5 6\n7 8 9","25"],["2\n1 2\n3 4","10"],["1\n5","5"]]),

  P("Boundary Elements","Rookie",["arrays","matrix"],
    "Given an `M×N` matrix, print the sum of its boundary elements.",
    "1 ≤ M, N ≤ 100",
    "3 3\n1 2 3\n4 5 6\n7 8 9","40",
    [["3 3\n1 2 3\n4 5 6\n7 8 9","40"],["1 1\n5","5"],["2 2\n1 2\n3 4","10"]]),

  P("Zigzag Array","Rookie",["arrays"],
    "Given an array `a` of `N` distinct integers, rearrange it in zigzag form: `a[0] < a[1] > a[2] < a[3] > ...`. Print any valid arrangement.",
    "1 ≤ N ≤ 10^5",
    "5\n4 3 7 8 6","3 7 4 8 6",
    [["5\n4 3 7 8 6","3 7 4 8 6"],["3\n1 2 3","1 3 2"],["2\n5 1","1 5"]]),

  P("Count Inversions (Brute)","Rookie",["arrays"],
    "Count the number of pairs `(i, j)` where `i < j` and `a[i] > a[j]`.",
    "1 ≤ N ≤ 5000",
    "5\n2 4 1 3 5","3",
    [["5\n2 4 1 3 5","3"],["3\n3 2 1","3"],["3\n1 2 3","0"],["4\n1 1 1 1","0"]]),

  // ---- MORE ROOKIE: recursion, basic logic, simulation ----
  P("Power of Three","Rookie",["math"],
    "Given `N`, print `Yes` if it is a power of 3, else `No`.",
    "1 ≤ N ≤ 10^18",
    "27","Yes",
    [["27","Yes"],["12","No"],["1","Yes"],["243","Yes"],["10","No"]]),

  P("Palindrome Subsequence Count","Rookie",["strings"],
    "Count the number of single-character palindromic subsequences in string `S` (i.e., just the count of characters — which is always |S|). Just kidding — count the distinct characters instead.",
    "1 ≤ |S| ≤ 10^5; lowercase only",
    "abcab","3",
    [["abcab","3"],["aaaa","1"],["abcdef","6"],["aabb","2"]]),

  P("Sum of First N Even","Rookie",["math"],
    "Given `N`, print the sum of first `N` even natural numbers: 2 + 4 + ... + 2N.",
    "1 ≤ N ≤ 10^9",
    "5","30",
    [["5","30"],["1","2"],["10","110"],["1000000","1000001000000"]]),

  P("Sum of First N Odd","Rookie",["math"],
    "Given `N`, print the sum of first `N` odd natural numbers: 1 + 3 + ... + (2N-1).",
    "1 ≤ N ≤ 10^9",
    "5","25",
    [["5","25"],["1","1"],["10","100"],["1000","1000000"]]),

  P("Check Perfect Square","Rookie",["math"],
    "Given `N`, print `Yes` if it's a perfect square, else `No`.",
    "0 ≤ N ≤ 10^18",
    "49","Yes",
    [["49","Yes"],["50","No"],["0","Yes"],["1","Yes"],["10000000000","No"]]),

  P("Base Conversion","Rookie",["math"],
    "Given a non-negative integer `N` and a base `B` (2 ≤ B ≤ 16), print `N` in base `B`. Use uppercase A-F for digits 10-15.",
    "0 ≤ N ≤ 10^9; 2 ≤ B ≤ 16",
    "255 16","FF",
    [["255 16","FF"],["10 2","1010"],["0 8","0"],["100 8","144"]]),

  P("Roman to Integer","Rookie",["strings","simulation"],
    "Given a valid Roman numeral string, convert it to an integer.",
    "1 ≤ result ≤ 3999",
    "MCMXCIV","1994",
    [["MCMXCIV","1994"],["III","3"],["IV","4"],["IX","9"],["LVIII","58"]]),

  P("Integer to Roman","Rookie",["strings","simulation"],
    "Given an integer `N` (1 ≤ N ≤ 3999), convert it to a Roman numeral string.",
    "1 ≤ N ≤ 3999",
    "1994","MCMXCIV",
    [["1994","MCMXCIV"],["3","III"],["58","LVIII"],["9","IX"]]),

  P("Next Greater Element","Rookie",["arrays","stack"],
    "For each element in array `a`, find the first element to its right that is strictly greater. If none, output `-1`. Print the result array.",
    "1 ≤ N ≤ 10^5",
    "4\n4 5 2 10","5 10 10 -1",
    [["4\n4 5 2 10","5 10 10 -1"],["3\n3 2 1","-1 -1 -1"],["3\n1 2 3","2 3 -1"]]),

  P("Valid Brackets","Rookie",["strings","stack"],
    "Given a string with `()`, `[]`, `{}`, print `Yes` if all brackets are properly nested, else `No`.",
    "0 ≤ |S| ≤ 10^5",
    "({[]})","Yes",
    [["({[]})","Yes"],["([)]","No"],["","Yes"],["((()))","Yes"],["(","No"]]),

  P("Josephus Problem (N=2)","Rookie",["math","simulation"],
    "N people stand in a circle. Every 2nd person is eliminated. Given `N`, print the position (1-based) of the last person standing.",
    "1 ≤ N ≤ 10^6",
    "5","3",
    [["5","3"],["1","1"],["6","5"],["10","5"]]),

  P("Matrix Multiplication Check","Rookie",["math","matrix"],
    "Given dimensions of two matrices (R1×C1 and R2×C2), print `Yes` if they can be multiplied, else `No`.",
    "1 ≤ all dimensions ≤ 1000",
    "2 3 3 4","Yes",
    [["2 3 3 4","Yes"],["2 3 4 5","No"],["1 1 1 1","Yes"]]),

  P("Decimal to Binary","Rookie",["math","bit-manipulation"],
    "Given a non-negative integer, print its binary representation.",
    "0 ≤ N ≤ 10^9",
    "13","1101",
    [["13","1101"],["0","0"],["1","1"],["255","11111111"]]),

  P("Binary to Decimal","Rookie",["math","bit-manipulation"],
    "Given a binary string, print its decimal value.",
    "1 ≤ |S| ≤ 30; S contains only 0 and 1",
    "1101","13",
    [["1101","13"],["0","0"],["1","1"],["11111111","255"]]),

  P("Unique Elements","Rookie",["arrays","hashing"],
    "Given `N` integers, print only the elements that appear exactly once, in their original order.",
    "1 ≤ N ≤ 10^5",
    "7\n1 2 3 2 4 1 5","3 4 5",
    [["7\n1 2 3 2 4 1 5","3 4 5"],["3\n1 1 1",""],["4\n1 2 3 4","1 2 3 4"]]),

  P("Compress Sorted Array","Rookie",["arrays"],
    "Given a sorted array, replace each element with its rank (1-based). Equal elements get the same rank.",
    "1 ≤ N ≤ 10^5",
    "6\n10 20 20 30 40 40","1 2 2 3 4 4",
    [["6\n10 20 20 30 40 40","1 2 2 3 4 4"],["3\n1 1 1","1 1 1"],["4\n1 2 3 4","1 2 3 4"]]),

  P("FizzBuzz","Rookie",["loops","conditionals"],
    "Print numbers from 1 to `N`. For multiples of 3 print `Fizz`, multiples of 5 print `Buzz`, multiples of both print `FizzBuzz`.",
    "1 ≤ N ≤ 10^4",
    "5","1\n2\nFizz\n4\nBuzz",
    [["5","1\n2\nFizz\n4\nBuzz"],["15","1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz"],["1","1"]]),

  P("Alternating Sum","Rookie",["arrays"],
    "Given `N` integers, compute `a[0] - a[1] + a[2] - a[3] + ...` (alternating signs).",
    "1 ≤ N ≤ 10^5; |a_i| ≤ 10^9",
    "5\n1 2 3 4 5","3",
    [["5\n1 2 3 4 5","3"],["1\n10","10"],["2\n5 3","2"],["4\n1 1 1 1","0"]]),

  P("XOR of Array","Rookie",["arrays","bit-manipulation"],
    "Given `N` integers, print the XOR of all elements.",
    "1 ≤ N ≤ 10^5; 0 ≤ a_i ≤ 10^9",
    "5\n1 2 3 4 5","1",
    [["5\n1 2 3 4 5","1"],["3\n5 5 5","5"],["4\n1 1 2 2","0"]]),

  P("Nearest Smaller Element","Rookie",["arrays","stack"],
    "For each element in the array, find the nearest smaller element to its left. If none, output `-1`.",
    "1 ≤ N ≤ 10^5",
    "5\n4 5 2 10 8","-1 4 -1 2 2",
    [["5\n4 5 2 10 8","-1 4 -1 2 2"],["3\n1 2 3","-1 1 2"],["3\n3 2 1","-1 -1 -1"]]),

  // Extra Rookie to fill pool
  P("Count Words Starting With Vowel","Rookie",["strings"],
    "Given a sentence, count how many words start with a vowel (case-insensitive).",
    "1 ≤ |S| ≤ 10^5",
    "An apple is on the table","3",
    [["An apple is on the table","3"],["hello world","0"],["I am ok","2"]]),

  P("Longest Common Prefix","Rookie",["strings"],
    "Given `N` strings, find their longest common prefix.",
    "1 ≤ N ≤ 100; 1 ≤ |S_i| ≤ 200",
    "3\nflower\nflow\nflight","fl",
    [["3\nflower\nflow\nflight","fl"],["2\nabc\nxyz",""],["3\nabc\nabc\nabc","abc"]]),

  P("Count Pairs with Difference K","Rookie",["arrays","hashing"],
    "Given `N` distinct integers and `K`, count pairs `(i,j)` where `|a[i]-a[j]| = K` and `i < j`.",
    "2 ≤ N ≤ 10^5; 1 ≤ K ≤ 10^9",
    "5 2\n1 5 3 4 2","3",
    [["5 2\n1 5 3 4 2","3"],["3 1\n1 2 3","2"],["2 10\n1 2","0"]]),

  P("Sum Between Two Indices","Rookie",["arrays","prefix-sum"],
    "Given `N` integers and `Q` queries, each query `L R` (1-based), print the sum of elements from index L to R.",
    "1 ≤ N, Q ≤ 10^5; |a_i| ≤ 10^6",
    "5\n1 2 3 4 5\n3\n1 3\n2 5\n1 5","6\n14\n15",
    [["5\n1 2 3 4 5\n3\n1 3\n2 5\n1 5","6\n14\n15"],["3\n1 1 1\n1\n1 3","3"]]),

  P("Rearrange Alternately","Rookie",["arrays"],
    "Given a sorted array, rearrange it such that the first element is max, second is min, third is second max, fourth is second min, and so on.",
    "1 ≤ N ≤ 10^5",
    "6\n1 2 3 4 5 6","6 1 5 2 4 3",
    [["6\n1 2 3 4 5 6","6 1 5 2 4 3"],["3\n1 2 3","3 1 2"],["1\n5","5"]]),

  P("Wave Array","Rookie",["arrays","sorting"],
    "Given an array, arrange it in wave form: `a[0] >= a[1] <= a[2] >= a[3] ...`. Print the lexicographically smallest wave form.",
    "1 ≤ N ≤ 10^5",
    "5\n10 5 6 3 2","3 2 6 5 10",
    [["5\n10 5 6 3 2","3 2 6 5 10"],["4\n1 2 3 4","2 1 4 3"],["2\n5 1","5 1"]]),

  P("Kth Smallest Element","Rookie",["arrays","sorting"],
    "Given `N` integers and `K`, print the Kth smallest element (1-based).",
    "1 ≤ K ≤ N ≤ 10^5",
    "6 3\n7 10 4 3 20 15","7",
    [["6 3\n7 10 4 3 20 15","7"],["5 1\n5 4 3 2 1","1"],["3 3\n1 2 3","3"]]),

  P("Sort by Frequency","Rookie",["arrays","hashing","sorting"],
    "Given `N` integers, sort them by frequency (highest first). If frequencies are equal, the smaller number comes first.",
    "1 ≤ N ≤ 10^5; 1 ≤ a_i ≤ 10^6",
    "8\n2 5 2 8 5 6 8 8","8 8 8 2 2 5 5 6",
    [["8\n2 5 2 8 5 6 8 8","8 8 8 2 2 5 5 6"],["3\n1 2 3","1 2 3"],["4\n4 4 1 1","1 1 4 4"]]),

  P("Matrix Row Sum","Rookie",["arrays","matrix"],
    "Given an `M×N` matrix, print the sum of each row on a separate line.",
    "1 ≤ M, N ≤ 100",
    "2 3\n1 2 3\n4 5 6","6\n15",
    [["2 3\n1 2 3\n4 5 6","6\n15"],["1 1\n5","5"],["3 2\n1 1\n2 2\n3 3","2\n4\n6"]]),

  P("Count Set Bits","Rookie",["math","bit-manipulation"],
    "Given `N`, count the number of 1-bits in its binary representation.",
    "0 ≤ N ≤ 10^9",
    "13","3",
    [["13","3"],["0","0"],["255","8"],["1024","1"],["7","3"]]),

  P("Swap Without Temp","Rookie",["math"],
    "Given two integers `a` and `b`, print them swapped (each on its own line).",
    "−10^9 ≤ a, b ≤ 10^9",
    "5 10","10\n5",
    [["5 10","10\n5"],["0 0","0\n0"],["-1 1","1\n-1"]]),

  P("Array is Subset","Rookie",["arrays","hashing"],
    "Given two arrays A and B, print `Yes` if B is a subset of A (every element in B appears in A with at least that many occurrences), else `No`.",
    "1 ≤ |B| ≤ |A| ≤ 10^5",
    "5\n1 2 3 4 5\n3\n1 3 5","Yes",
    [["5\n1 2 3 4 5\n3\n1 3 5","Yes"],["3\n1 2 3\n2\n1 4","No"],["3\n1 1 2\n2\n1 1","Yes"]]),

  P("Symmetric Array","Rookie",["arrays"],
    "Given `N` integers, print `Yes` if the array reads the same forwards and backwards.",
    "1 ≤ N ≤ 10^5",
    "5\n1 2 3 2 1","Yes",
    [["5\n1 2 3 2 1","Yes"],["4\n1 2 2 1","Yes"],["3\n1 2 3","No"]]),

  P("Maximum Product of Two","Rookie",["arrays"],
    "Given `N` integers, find the maximum product of any two elements.",
    "2 ≤ N ≤ 10^5; |a_i| ≤ 10^6",
    "5\n-10 -3 5 6 -2","30",
    [["5\n-10 -3 5 6 -2","30"],["2\n-4 -5","20"],["3\n1 2 3","6"]]),

  P("Celebrity Problem (Simple)","Rookie",["arrays","simulation"],
    "In a group of `N` people, a celebrity is known by everyone but knows no one. Given an `N×N` matrix where `M[i][j]=1` means `i` knows `j`, find the celebrity (0-based index) or print `-1`.",
    "1 ≤ N ≤ 100",
    "3\n0 1 0\n0 0 0\n0 1 0","1",
    [["3\n0 1 0\n0 0 0\n0 1 0","1"],["2\n0 0\n0 0","-1"],["2\n0 1\n0 0","1"]]),

  P("Check Arithmetic Progression","Rookie",["arrays","sorting"],
    "Given `N` integers, determine if they can be rearranged to form an arithmetic progression. Print `Yes` or `No`.",
    "2 ≤ N ≤ 10^5",
    "4\n3 5 1 7","Yes",
    [["4\n3 5 1 7","Yes"],["3\n1 2 4","No"],["2\n1 100","Yes"]]),

  P("Maximum Gap After Sort","Rookie",["arrays","sorting"],
    "Given `N` integers, find the maximum difference between successive elements when the array is sorted.",
    "2 ≤ N ≤ 10^5; 0 ≤ a_i ≤ 10^9",
    "5\n3 6 9 1 15","6",
    [["5\n3 6 9 1 15","6"],["2\n1 10","9"],["4\n1 2 3 4","1"]]),

  P("Array Mean and Median","Rookie",["arrays","sorting","math"],
    "Given `N` integers, print the mean (rounded to 2 decimal places) and median (if N is even, average the two middle values, rounded to 2 decimal places) on separate lines.",
    "1 ≤ N ≤ 10^5; |a_i| ≤ 10^6",
    "5\n1 3 5 7 9","5.00\n5.00",
    [["5\n1 3 5 7 9","5.00\n5.00"],["4\n1 2 3 4","2.50\n2.50"],["1\n7","7.00\n7.00"]]),

  P("Swap Alternate Elements","Rookie",["arrays"],
    "Given `N` integers, swap every pair of adjacent elements. If N is odd, the last element stays.",
    "1 ≤ N ≤ 10^5",
    "5\n1 2 3 4 5","2 1 4 3 5",
    [["5\n1 2 3 4 5","2 1 4 3 5"],["4\n1 2 3 4","2 1 4 3"],["1\n5","5"]]),

  P("Trapping Rain Water (Visual)","Rookie",["arrays"],
    "Given `N` non-negative integers representing bar heights, compute how much water can be trapped after raining.",
    "1 ≤ N ≤ 10^5; 0 ≤ h_i ≤ 10^4",
    "6\n0 1 0 2 1 0","1",
    [["6\n0 1 0 2 1 0","1"],["12\n0 1 0 2 1 0 1 3 2 1 2 1","6"],["3\n3 0 3","3"]]),

  P("Longest Consecutive Sequence","Rookie",["arrays","hashing"],
    "Given `N` integers (unsorted), find the length of the longest consecutive elements sequence (e.g., 1,2,3,4 has length 4).",
    "1 ≤ N ≤ 10^5; |a_i| ≤ 10^9",
    "6\n100 4 200 1 3 2","4",
    [["6\n100 4 200 1 3 2","4"],["5\n1 2 3 4 5","5"],["4\n10 30 20 40","1"]]),

  P("Contains Duplicate Within K","Rookie",["arrays","hashing"],
    "Given `N` integers and `K`, determine if there exist two distinct indices `i` and `j` such that `a[i] == a[j]` and `|i-j| ≤ K`.",
    "1 ≤ N ≤ 10^5; 1 ≤ K ≤ N",
    "5 3\n1 2 3 1 5","Yes",
    [["5 3\n1 2 3 1 5","Yes"],["6 2\n1 2 3 4 5 1","No"],["4 1\n1 1 2 3","Yes"]]),

  P("Sum of Odd-Positioned Elements","Rookie",["arrays"],
    "Given `N` integers, print the sum of elements at odd positions (1-based: 1st, 3rd, 5th, ...).",
    "1 ≤ N ≤ 10^5",
    "5\n1 2 3 4 5","9",
    [["5\n1 2 3 4 5","9"],["1\n10","10"],["4\n1 2 3 4","4"]]),

  P("Smallest Subarray with Sum >= S","Rookie",["arrays","sliding-window"],
    "Given `N` positive integers and `S`, find the length of the smallest contiguous subarray whose sum is ≥ S. If none, print `0`.",
    "1 ≤ N ≤ 10^5; 1 ≤ a_i, S ≤ 10^9",
    "6 7\n2 3 1 2 4 3","2",
    [["6 7\n2 3 1 2 4 3","2"],["3 100\n1 2 3","0"],["5 5\n1 1 1 1 5","1"]]),
];

// ========================================================================
//  OPERATIVE POOL
// ========================================================================
const OPERATIVE = [
  // ---- TWO POINTERS ----
  P("Two Sum Sorted","Operative",["two-pointers","arrays"],
    "Given a sorted array of `N` integers and target `T`, find two numbers that add up to `T`. Print their 1-based indices. Guaranteed exactly one solution.",
    "2 ≤ N ≤ 10^5; −10^9 ≤ a_i ≤ 10^9",
    "5 9\n2 3 4 5 7","1 5",
    [["5 9\n2 3 4 5 7","1 5"],["3 6\n1 3 5","1 3"],["4 0\n-5 -3 3 5","1 4"]]),

  P("Three Sum Zero","Operative",["two-pointers","sorting"],
    "Given `N` integers, find all unique triplets that sum to zero. Print each triplet sorted, one per line, triplets in lexicographic order. If none, print `0`.",
    "3 ≤ N ≤ 3000; |a_i| ≤ 10^5",
    "6\n-1 0 1 2 -1 -4","-4 2 2\n-1 0 1",
    [["6\n-1 0 1 2 -1 -4","-4 2 2\n-1 0 1"],["3\n1 2 3","0"],["4\n0 0 0 0","0 0 0"]]),

  P("Container With Most Water","Operative",["two-pointers","greedy"],
    "Given `N` vertical lines at positions `0..N-1` with heights `h[i]`, find two lines that together with the x-axis form a container holding the most water. Print the max area.",
    "2 ≤ N ≤ 10^5; 1 ≤ h_i ≤ 10^4",
    "9\n1 8 6 2 5 4 8 3 7","49",
    [["9\n1 8 6 2 5 4 8 3 7","49"],["2\n1 1","1"],["4\n1 2 3 4","4"]]),

  P("Remove Duplicates In-Place","Operative",["two-pointers","arrays"],
    "Given a sorted array, remove duplicates in-place and return the new length. Print the length followed by the deduplicated elements.",
    "1 ≤ N ≤ 10^5",
    "7\n1 1 2 2 3 4 4","4\n1 2 3 4",
    [["7\n1 1 2 2 3 4 4","4\n1 2 3 4"],["5\n1 1 1 1 1","1\n1"],["4\n1 2 3 4","4\n1 2 3 4"]]),

  P("Sort Array by Parity","Operative",["two-pointers","arrays"],
    "Given `N` integers, rearrange so all even numbers come before all odd numbers. Maintain relative order within evens and odds separately.",
    "1 ≤ N ≤ 10^5",
    "6\n3 1 2 4 5 6","2 4 6 3 1 5",
    [["6\n3 1 2 4 5 6","2 4 6 3 1 5"],["3\n1 3 5","1 3 5"],["3\n2 4 6","2 4 6"]]),

  P("Boats to Save People","Operative",["two-pointers","greedy","sorting"],
    "Each boat carries at most 2 people with weight limit `L`. Given `N` people's weights, find the minimum number of boats.",
    "1 ≤ N ≤ 5×10^4; 1 ≤ w_i ≤ L ≤ 3×10^4",
    "4 5\n1 2 3 4","2",
    [["4 5\n1 2 3 4","2"],["3 3\n3 2 1","2"],["5 5\n1 1 1 1 1","3"]]),

  P("Longest Substring Without Repeat","Operative",["two-pointers","sliding-window","hashing"],
    "Given a string `S`, find the length of the longest substring without repeating characters.",
    "1 ≤ |S| ≤ 10^5",
    "abcabcbb","3",
    [["abcabcbb","3"],["bbbbb","1"],["pwwkew","3"],["","0"],["abcdef","6"]]),

  P("Minimum Window Substring","Operative",["sliding-window","hashing"],
    "Given strings `S` and `T`, find the minimum window in `S` that contains all characters of `T`. Print the window string, or empty if none.",
    "1 ≤ |S|, |T| ≤ 10^5",
    "ADOBECODEBANC\nABC","BANC",
    [["ADOBECODEBANC\nABC","BANC"],["a\na","a"],["a\naa",""]]),

  P("Max Consecutive Ones III","Operative",["sliding-window"],
    "Given a binary array and `K`, find the maximum number of consecutive 1s if you can flip at most `K` zeros.",
    "1 ≤ N ≤ 10^5; 0 ≤ K ≤ N",
    "10 2\n1 1 1 0 0 0 1 1 1 1","6",
    [["10 2\n1 1 1 0 0 0 1 1 1 1","6"],["5 0\n1 1 0 1 1","2"],["5 5\n0 0 0 0 0","5"]]),

  P("Subarrays with K Distinct","Operative",["sliding-window","hashing"],
    "Given `N` integers and `K`, count the number of subarrays with exactly `K` distinct integers.",
    "1 ≤ N ≤ 2×10^4; 1 ≤ K ≤ N",
    "5 2\n1 2 1 2 3","7",
    [["5 2\n1 2 1 2 3","7"],["3 1\n1 1 1","6"],["4 3\n1 2 3 4","2"]]),

  // ---- BINARY SEARCH ----
  P("Binary Search Classic","Operative",["binary-search"],
    "Given a sorted array of `N` integers and target `X`, print the 0-based index of `X`, or `-1` if not found.",
    "1 ≤ N ≤ 10^6",
    "5 4\n1 2 3 4 5","3",
    [["5 4\n1 2 3 4 5","3"],["5 6\n1 2 3 4 5","-1"],["1 1\n1","0"]]),

  P("First and Last Position","Operative",["binary-search"],
    "Given a sorted array and target `X`, find the first and last index (0-based) of `X`. Print them space-separated, or `-1 -1` if not found.",
    "1 ≤ N ≤ 10^6",
    "6 3\n1 2 3 3 3 4","2 4",
    [["6 3\n1 2 3 3 3 4","2 4"],["5 6\n1 2 3 4 5","-1 -1"],["1 1\n1","0 0"]]),

  P("Square Root Integer","Operative",["binary-search","math"],
    "Given `N`, find the integer square root (floor of √N) without using built-in sqrt.",
    "0 ≤ N ≤ 10^18",
    "8","2",
    [["8","2"],["0","0"],["1","1"],["100","10"],["999999999999999999","999999999"]]),

  P("Peak Element in Array","Operative",["binary-search"],
    "Given an array where no two adjacent elements are equal, find a peak element (greater than its neighbors) and print its index (0-based). Any peak is valid.",
    "1 ≤ N ≤ 10^5",
    "5\n1 2 3 1 0","2",
    [["5\n1 2 3 1 0","2"],["3\n3 2 1","0"],["3\n1 2 3","2"]]),

  P("Search in Rotated Array","Operative",["binary-search"],
    "A sorted array was rotated at some pivot. Given the array and target, find the index (0-based) or `-1`.",
    "1 ≤ N ≤ 10^5",
    "7 0\n4 5 6 7 0 1 2","4",
    [["7 0\n4 5 6 7 0 1 2","4"],["7 3\n4 5 6 7 0 1 2","-1"],["1 5\n5","0"]]),

  P("Minimum in Rotated Array","Operative",["binary-search"],
    "A sorted array of distinct elements was rotated. Find the minimum element.",
    "1 ≤ N ≤ 10^5",
    "5\n3 4 5 1 2","1",
    [["5\n3 4 5 1 2","1"],["5\n1 2 3 4 5","1"],["2\n2 1","1"]]),

  P("Koko Eating Bananas","Operative",["binary-search"],
    "Koko has `N` piles of bananas. Guards return in `H` hours. She eats at speed `K` bananas/hour (if pile < K, she finishes it and waits). Find the minimum `K` so she finishes all piles in `H` hours.",
    "1 ≤ N ≤ 10^4; N ≤ H ≤ 10^9; 1 ≤ piles[i] ≤ 10^9",
    "4 8\n3 6 7 11","4",
    [["4 8\n3 6 7 11","4"],["3 5\n30 11 23","23"],["3 6\n30 11 23","23"]]),

  P("Aggressive Cows","Operative",["binary-search","greedy"],
    "Given `N` stall positions and `C` cows, place cows in stalls to maximize the minimum distance between any two cows.",
    "2 ≤ C ≤ N ≤ 10^5; 0 ≤ pos_i ≤ 10^9",
    "5 3\n1 2 4 8 9","3",
    [["5 3\n1 2 4 8 9","3"],["3 2\n1 5 10","9"],["4 2\n1 2 3 4","3"]]),

  P("Median of Two Sorted Arrays","Operative",["binary-search"],
    "Given two sorted arrays of sizes `M` and `N`, find the median of the merged array. Print it with 1 decimal place.",
    "1 ≤ M+N ≤ 2×10^5",
    "3\n1 3 5\n3\n2 4 6","3.5",
    [["3\n1 3 5\n3\n2 4 6","3.5"],["2\n1 2\n1\n3","2.0"],["1\n1\n1\n2","1.5"]]),

  P("Allocate Minimum Pages","Operative",["binary-search","greedy"],
    "Given `N` books with pages and `M` students, assign contiguous books to each student to minimize the maximum pages any student reads. Each student gets at least one book.",
    "1 ≤ M ≤ N ≤ 10^5; 1 ≤ pages_i ≤ 10^6",
    "4 2\n12 34 67 90","113",
    [["4 2\n12 34 67 90","113"],["3 1\n10 20 30","60"],["3 3\n10 20 30","30"]]),

  // ---- HASH MAP ----
  P("Two Sum Unsorted","Operative",["hashing","arrays"],
    "Given `N` integers and target `T`, find two indices (0-based) whose values sum to `T`. Print them (smaller first). Exactly one solution exists.",
    "2 ≤ N ≤ 10^5",
    "4 9\n2 7 11 15","0 1",
    [["4 9\n2 7 11 15","0 1"],["3 6\n3 2 4","1 2"]]),

  P("Group Anagrams","Operative",["hashing","strings","sorting"],
    "Given `N` strings, group anagrams together. Print each group on a separate line (words space-separated, groups sorted by first word alphabetically).",
    "1 ≤ N ≤ 10^4; 1 ≤ |S_i| ≤ 100",
    "6\neat tea tan ate nat bat","ate eat tea\nbat\nnat tan",
    [["6\neat tea tan ate nat bat","ate eat tea\nbat\nnat tan"],["1\nabc","abc"]]),

  P("Subarray Sum Equals K","Operative",["hashing","prefix-sum"],
    "Given `N` integers and `K`, count the number of contiguous subarrays that sum to `K`.",
    "1 ≤ N ≤ 2×10^4; |a_i|, |K| ≤ 10^7",
    "5 3\n1 1 1 2 3","3",
    [["5 3\n1 1 1 2 3","3"],["3 0\n1 -1 0","3"],["4 7\n3 4 7 2","2"]]),

  P("Longest Subarray with Sum K","Operative",["hashing","prefix-sum"],
    "Given `N` integers and `K`, find the length of the longest contiguous subarray with sum `K`.",
    "1 ≤ N ≤ 10^5; |a_i|, |K| ≤ 10^9",
    "6 3\n1 -1 5 -2 3 0","4",
    [["6 3\n1 -1 5 -2 3 0","4"],["3 0\n0 0 0","3"],["3 10\n1 2 3","0"]]),

  P("Top K Frequent Elements","Operative",["hashing","sorting"],
    "Given `N` integers and `K`, print the `K` most frequent elements (sorted by frequency desc, ties broken by value asc).",
    "1 ≤ K ≤ distinct elements ≤ N ≤ 10^5",
    "7 2\n1 1 1 2 2 3 4","1 2",
    [["7 2\n1 1 1 2 2 3 4","1 2"],["4 1\n1 2 3 4","1"],["5 2\n5 5 3 3 1","3 5"]]),

  P("Isomorphic Strings","Operative",["hashing","strings"],
    "Given two strings `A` and `B`, print `Yes` if they are isomorphic (each character in A maps to exactly one character in B and vice versa), else `No`.",
    "1 ≤ |A| = |B| ≤ 10^5",
    "egg\nadd","Yes",
    [["egg\nadd","Yes"],["foo\nbar","No"],["paper\ntitle","Yes"],["ab\naa","No"]]),

  P("Longest Palindromic Substring","Operative",["strings","two-pointers"],
    "Given a string `S`, find the longest palindromic substring. If multiple of same length, print the first one.",
    "1 ≤ |S| ≤ 1000",
    "babad","bab",
    [["babad","bab"],["cbbd","bb"],["a","a"],["racecar","racecar"]]),

  P("Valid Sudoku","Operative",["hashing","matrix"],
    "Given a 9×9 Sudoku board (digits 1-9 and '.' for empty), print `Yes` if the filled cells are valid (no repeats in any row, column, or 3×3 box), else `No`.",
    "Board is always 9×9",
    "9\n5 3 . . 7 . . . .\n6 . . 1 9 5 . . .\n. 9 8 . . . . 6 .\n8 . . . 6 . . . 3\n4 . . 8 . 3 . . 1\n7 . . . 2 . . . 6\n. 6 . . . . 2 8 .\n. . . 4 1 9 . . 5\n. . . . 8 . . 7 9","Yes",
    [["9\n5 3 . . 7 . . . .\n6 . . 1 9 5 . . .\n. 9 8 . . . . 6 .\n8 . . . 6 . . . 3\n4 . . 8 . 3 . . 1\n7 . . . 2 . . . 6\n. 6 . . . . 2 8 .\n. . . 4 1 9 . . 5\n. . . . 8 . . 7 9","Yes"]]),

  P("Custom Sort String","Operative",["hashing","strings","sorting"],
    "Given an order string `O` (permutation of some lowercase letters) and string `S`, sort `S` so that characters appear in the order specified by `O`. Characters not in `O` go to the end in original order.",
    "1 ≤ |O|, |S| ≤ 200",
    "cba\nabcd","cbad",
    [["cba\nabcd","cbad"],["abc\nzzz","zzz"],["xyz\nabcxyz","xyzabc"]]),

  P("First Missing Positive","Operative",["hashing","arrays"],
    "Given `N` unsorted integers, find the smallest missing positive integer in O(N) time.",
    "1 ≤ N ≤ 10^5; |a_i| ≤ 10^9",
    "4\n3 4 -1 1","2",
    [["4\n3 4 -1 1","2"],["3\n1 2 3","4"],["1\n7","1"],["3\n-1 -2 -3","1"]]),

  // ---- STACK ----
  P("Next Greater Element Circular","Operative",["stack","arrays"],
    "Given a circular array of `N` integers, for each element find the next strictly greater element (wrapping around). Print results space-separated; `-1` if none.",
    "1 ≤ N ≤ 10^5",
    "3\n1 2 1","2 -1 2",
    [["3\n1 2 1","2 -1 2"],["4\n1 2 3 4","-1 -1 -1 -1"],["3\n3 3 3","-1 -1 -1"]]),

  P("Largest Rectangle in Histogram","Operative",["stack"],
    "Given `N` bar heights, find the area of the largest rectangle that can be formed in the histogram.",
    "1 ≤ N ≤ 10^5; 0 ≤ h_i ≤ 10^4",
    "6\n2 1 5 6 2 3","10",
    [["6\n2 1 5 6 2 3","10"],["1\n5","5"],["3\n2 2 2","6"]]),

  P("Min Stack Operations","Operative",["stack","design"],
    "Implement a stack supporting push, pop, top, and getMin in O(1).\n\nInput: `Q` operations. Each: `push x`, `pop`, `top`, `getMin`. For `top` and `getMin`, print the result.",
    "1 ≤ Q ≤ 10^5",
    "7\npush -2\npush 0\npush -3\ngetMin\npop\ntop\ngetMin","-3\n0\n-2",
    [["7\npush -2\npush 0\npush -3\ngetMin\npop\ntop\ngetMin","-3\n0\n-2"]]),

  P("Evaluate Reverse Polish Notation","Operative",["stack","math"],
    "Evaluate an expression in Reverse Polish Notation. Tokens are integers or `+`,`-`,`*`,`/` (integer division truncates toward zero).",
    "1 ≤ tokens ≤ 10^4",
    "5\n2 1 + 3 *","9",
    [["5\n2 1 + 3 *","9"],["5\n4 13 5 / +","6"],["1\n42","42"]]),

  P("Daily Temperatures","Operative",["stack"],
    "Given `N` daily temperatures, for each day find how many days until a warmer day. If none, output `0`.",
    "1 ≤ N ≤ 10^5; 30 ≤ temp ≤ 100",
    "8\n73 74 75 71 69 72 76 73","1 1 4 2 1 1 0 0",
    [["8\n73 74 75 71 69 72 76 73","1 1 4 2 1 1 0 0"],["3\n100 100 100","0 0 0"]]),

  P("Decode String","Operative",["stack","strings"],
    "Given an encoded string like `3[a2[c]]`, decode it. Numbers before brackets mean repeat.\n\nExample: `3[a2[c]]` → `accaccacc`",
    "1 ≤ |S| ≤ 10^4",
    "3[a2[c]]","accaccacc",
    [["3[a2[c]]","accaccacc"],["2[abc]3[cd]ef","abcabccdcdcdef"],["10[a]","aaaaaaaaaa"]]),

  P("Asteroid Collision","Operative",["stack","simulation"],
    "Asteroids move in a row. Positive = right, negative = left. When they collide, smaller one explodes (equal = both explode). Print remaining asteroids left to right.",
    "1 ≤ N ≤ 10^4; |a_i| ≤ 1000; a_i ≠ 0",
    "4\n5 10 -5 -10","",
    [["4\n5 10 -5 -10",""],["3\n5 -5 10","10"],["4\n8 -8 5 -5",""],["3\n10 2 -5","10"]]),

  P("Remove K Digits","Operative",["stack","greedy"],
    "Given a non-negative integer `num` as a string and integer `k`, remove `k` digits to make the number as small as possible. Print the result (no leading zeros).",
    "1 ≤ |num| ≤ 10^5; 0 ≤ k ≤ |num|",
    "1432219\n3","1219",
    [["1432219\n3","1219"],["10200\n1","200"],["10\n2","0"]]),

  // ---- LINKED LIST ----
  P("Reverse Linked List","Operative",["linked-list"],
    "Given `N` integers representing a linked list, reverse it and print the result.",
    "1 ≤ N ≤ 10^5",
    "5\n1 2 3 4 5","5 4 3 2 1",
    [["5\n1 2 3 4 5","5 4 3 2 1"],["1\n1","1"],["3\n3 2 1","1 2 3"]]),

  P("Detect Cycle in List","Operative",["linked-list","two-pointers"],
    "Given `N` values and a `pos` (0-based) where the last node connects back to (`-1` if no cycle), determine if there's a cycle. Print `Yes` or `No`.",
    "1 ≤ N ≤ 10^5; −1 ≤ pos < N",
    "4 1\n3 2 0 -4","Yes",
    [["4 1\n3 2 0 -4","Yes"],["3 -1\n1 2 3","No"],["1 0\n1","Yes"]]),

  P("Merge Two Sorted Lists","Operative",["linked-list"],
    "Given two sorted linked lists (as arrays), merge them into one sorted list. Print the result.",
    "0 ≤ N, M ≤ 10^5",
    "3\n1 2 4\n3\n1 3 4","1 1 2 3 4 4",
    [["3\n1 2 4\n3\n1 3 4","1 1 2 3 4 4"],["0\n\n3\n1 2 3","1 2 3"],["2\n5 6\n0","5 6"]]),

  P("Remove Nth From End","Operative",["linked-list","two-pointers"],
    "Given a linked list of `N` nodes and `K`, remove the Kth node from the end. Print the modified list.",
    "1 ≤ K ≤ N ≤ 10^5",
    "5 2\n1 2 3 4 5","1 2 3 5",
    [["5 2\n1 2 3 4 5","1 2 3 5"],["1 1\n1",""],["2 1\n1 2","1"]]),

  P("Palindrome Linked List","Operative",["linked-list","two-pointers"],
    "Given a linked list as an array, determine if it's a palindrome. Print `Yes` or `No`.",
    "1 ≤ N ≤ 10^5",
    "4\n1 2 2 1","Yes",
    [["4\n1 2 2 1","Yes"],["3\n1 2 3","No"],["1\n5","Yes"]]),

  P("Intersection of Two Lists","Operative",["linked-list"],
    "Two linked lists merge at some node. Given both lists (as arrays with shared suffix starting at index `k` in list 2), find the value at the intersection node. If no intersection, print `-1`.",
    "1 ≤ N, M ≤ 10^5",
    "3\n4 1 8\n4\n5 6 1 8\n2","8",
    [["3\n4 1 8\n4\n5 6 1 8\n2","8"],["2\n1 2\n2\n3 4\n-1","-1"]]),

  P("Odd Even Linked List","Operative",["linked-list"],
    "Given a linked list, group all odd-indexed nodes followed by even-indexed nodes (1-based). Print the result.",
    "1 ≤ N ≤ 10^5",
    "5\n1 2 3 4 5","1 3 5 2 4",
    [["5\n1 2 3 4 5","1 3 5 2 4"],["4\n2 1 3 5","2 3 1 5"],["1\n1","1"]]),

  P("Flatten a Multilevel List","Operative",["linked-list","recursion"],
    "Given a list where each node has a value and possibly a child list (represented as nested arrays), flatten it to a single list using DFS order.\n\nInput: space-separated values, `[` starts a child, `]` ends it.",
    "1 ≤ total nodes ≤ 10^4",
    "1 2 [ 3 4 ] 5 6","1 2 3 4 5 6",
    [["1 2 [ 3 4 ] 5 6","1 2 3 4 5 6"],["1 [ 2 [ 3 ] ]","1 2 3"]]),

  // ---- TREE BASICS ----
  P("Binary Tree Inorder","Operative",["trees","recursion"],
    "Given a binary tree as array (level-order, -1 for null), print the inorder traversal.",
    "1 ≤ nodes ≤ 10^4",
    "7\n1 2 3 4 5 -1 6","4 2 5 1 3 6",
    [["7\n1 2 3 4 5 -1 6","4 2 5 1 3 6"],["1\n1","1"],["3\n1 2 3","2 1 3"]]),

  P("Binary Tree Level Order","Operative",["trees","bfs"],
    "Given a binary tree (level-order array, -1=null), print each level on a separate line.",
    "1 ≤ nodes ≤ 10^4",
    "7\n3 9 20 -1 -1 15 7","3\n9 20\n15 7",
    [["7\n3 9 20 -1 -1 15 7","3\n9 20\n15 7"],["1\n1","1"]]),

  P("Maximum Depth of Tree","Operative",["trees","recursion"],
    "Given a binary tree (level-order array, -1=null), find its maximum depth (number of nodes on longest root-to-leaf path).",
    "0 ≤ nodes ≤ 10^4",
    "5\n3 9 20 -1 -1","2",
    [["5\n3 9 20 -1 -1","2"],["1\n1","1"],["7\n1 2 3 4 -1 -1 -1","3"]]),

  P("Symmetric Tree","Operative",["trees","recursion"],
    "Given a binary tree (level-order, -1=null), check if it is a mirror of itself. Print `Yes` or `No`.",
    "1 ≤ nodes ≤ 10^4",
    "7\n1 2 2 3 4 4 3","Yes",
    [["7\n1 2 2 3 4 4 3","Yes"],["5\n1 2 2 -1 3","No"],["1\n1","Yes"]]),

  P("Path Sum in Tree","Operative",["trees","recursion"],
    "Given a binary tree (level-order, -1=null) and target sum `T`, print `Yes` if there exists a root-to-leaf path summing to `T`.",
    "1 ≤ nodes ≤ 10^4; |values|, |T| ≤ 10^6",
    "5 22\n5 4 8 11 -1 13 4\n7 2 -1 -1 -1 -1 -1 1","Yes",
    [["5 22\n5 4 8 11 -1 13 4\n7 2 -1 -1 -1 -1 -1 1","Yes"],["3 5\n1 2 3","No"]]),

  P("Validate BST","Operative",["trees","recursion"],
    "Given a binary tree (level-order, -1=null), determine if it is a valid Binary Search Tree. Print `Yes` or `No`.",
    "1 ≤ nodes ≤ 10^4",
    "5\n2 1 3 -1 -1","Yes",
    [["5\n2 1 3 -1 -1","Yes"],["5\n5 1 4 -1 -1 3 6","No"],["1\n1","Yes"]]),

  P("Lowest Common Ancestor","Operative",["trees","recursion"],
    "Given a binary tree (level-order, -1=null) and two node values `p` and `q`, find their Lowest Common Ancestor's value.",
    "2 ≤ nodes ≤ 10^4; p ≠ q, both exist",
    "7 5 1\n3 5 1 6 2 0 8","3",
    [["7 5 1\n3 5 1 6 2 0 8","3"],["7 5 4\n3 5 1 6 2 0 8","5"]]),

  P("Diameter of Binary Tree","Operative",["trees","recursion"],
    "The diameter is the longest path between any two nodes (counted in edges). Given a binary tree (level-order, -1=null), print the diameter.",
    "1 ≤ nodes ≤ 10^4",
    "5\n1 2 3 4 5","3",
    [["5\n1 2 3 4 5","3"],["1\n1","0"],["3\n1 2 -1","1"]]),

  P("Zigzag Level Order","Operative",["trees","bfs"],
    "Given a binary tree, print level order traversal in zigzag: left-to-right on first level, right-to-left on next, alternating.",
    "1 ≤ nodes ≤ 10^4",
    "7\n3 9 20 -1 -1 15 7","3\n20 9\n15 7",
    [["7\n3 9 20 -1 -1 15 7","3\n20 9\n15 7"],["1\n1","1"]]),

  P("Right Side View","Operative",["trees","bfs"],
    "Given a binary tree, print the values visible from the right side (last node of each level), top to bottom.",
    "1 ≤ nodes ≤ 10^4",
    "5\n1 2 3 -1 5","1 3 5",
    [["5\n1 2 3 -1 5","1 3 5"],["1\n1","1"],["3\n1 2 3","1 3"]]),

  // ---- BASIC DP ----
  P("Climbing Stairs","Operative",["dp"],
    "You can climb 1 or 2 steps. How many distinct ways to reach step `N`?",
    "1 ≤ N ≤ 45",
    "5","8",
    [["5","8"],["1","1"],["2","2"],["10","89"],["45","1836311903"]]),

  P("House Robber","Operative",["dp"],
    "Given `N` houses with money, you can't rob two adjacent houses. Find the maximum you can rob.",
    "1 ≤ N ≤ 10^5; 0 ≤ money_i ≤ 10^4",
    "4\n1 2 3 1","4",
    [["4\n1 2 3 1","4"],["5\n2 7 9 3 1","12"],["1\n5","5"]]),

  P("Coin Change Minimum","Operative",["dp"],
    "Given `N` coin denominations and amount `A`, find the minimum number of coins to make `A`. If impossible, print `-1`.",
    "1 ≤ N ≤ 12; 0 ≤ A ≤ 10^4",
    "3 11\n1 5 6","2",
    [["3 11\n1 5 6","2"],["3 3\n2 5 10","-1"],["1 0\n1","0"]]),

  P("Longest Increasing Subsequence","Operative",["dp","binary-search"],
    "Given `N` integers, find the length of the longest strictly increasing subsequence.",
    "1 ≤ N ≤ 10^5; |a_i| ≤ 10^9",
    "8\n10 9 2 5 3 7 101 18","4",
    [["8\n10 9 2 5 3 7 101 18","4"],["6\n0 1 0 3 2 3","4"],["1\n5","1"]]),

  P("0/1 Knapsack","Operative",["dp"],
    "Given `N` items with weights and values, and capacity `W`, find the maximum value achievable.",
    "1 ≤ N ≤ 100; 1 ≤ W ≤ 10^4",
    "3 50\n60 10\n100 20\n120 30","220",
    [["3 50\n60 10\n100 20\n120 30","220"],["1 5\n10 6","0"],["2 10\n5 5\n5 5","10"]]),

  P("Longest Common Subsequence","Operative",["dp","strings"],
    "Given two strings, find the length of their longest common subsequence.",
    "1 ≤ |A|, |B| ≤ 1000",
    "abcde\nace","3",
    [["abcde\nace","3"],["abc\nabc","3"],["abc\ndef","0"]]),

  P("Edit Distance","Operative",["dp","strings"],
    "Given two strings, find the minimum number of operations (insert, delete, replace) to convert one to the other.",
    "0 ≤ |A|, |B| ≤ 500",
    "horse\nros","3",
    [["horse\nros","3"],["intention\nexecution","5"],["abc\nabc","0"],["abc\n","3"]]),

  P("Unique Paths Grid","Operative",["dp","math"],
    "Given an `M×N` grid, count the number of unique paths from top-left to bottom-right (only move right or down).",
    "1 ≤ M, N ≤ 100",
    "3 7","28",
    [["3 7","28"],["1 1","1"],["3 3","6"]]),

  P("Decode Ways","Operative",["dp","strings"],
    "A message is encoded: 'A'=1, 'B'=2, ..., 'Z'=26. Given a digit string, count the number of ways to decode it.",
    "1 ≤ |S| ≤ 100; S[0] ≠ '0'",
    "226","3",
    [["226","3"],["12","2"],["0","0"],["1","1"],["111","3"]]),

  P("Maximum Product Subarray","Operative",["dp","arrays"],
    "Given `N` integers, find the contiguous subarray with the largest product. Print that product.",
    "1 ≤ N ≤ 10^4; |a_i| ≤ 10",
    "4\n2 3 -2 4","6",
    [["4\n2 3 -2 4","6"],["3\n-2 0 -1","0"],["3\n-2 -3 4","24"]]),

  P("Partition Equal Subset Sum","Operative",["dp"],
    "Given `N` positive integers, determine if the array can be partitioned into two subsets with equal sum. Print `Yes` or `No`.",
    "1 ≤ N ≤ 200; 1 ≤ a_i ≤ 100",
    "4\n1 5 11 5","Yes",
    [["4\n1 5 11 5","Yes"],["3\n1 2 3","Yes"],["3\n1 2 5","No"]]),

  P("Word Break","Operative",["dp","strings","hashing"],
    "Given string `S` and a dictionary of words, determine if `S` can be segmented into a space-separated sequence of dictionary words. Print `Yes` or `No`.",
    "1 ≤ |S| ≤ 300; 1 ≤ dict size ≤ 1000",
    "leetcode\n2\nleet code","Yes",
    [["leetcode\n2\nleet code","Yes"],["applepenapple\n2\napple pen","Yes"],["catsandog\n4\ncats dog sand and","No"]]),

  // ---- GREEDY ----
  P("Activity Selection","Operative",["greedy","sorting"],
    "Given `N` activities with start and finish times, find the maximum number of non-overlapping activities.",
    "1 ≤ N ≤ 10^5",
    "6\n1 3 0 5 8 5\n2 4 6 7 9 9","4",
    [["6\n1 3 0 5 8 5\n2 4 6 7 9 9","4"],["1\n0\n1","1"],["3\n1 1 1\n2 3 4","1"]]),

  P("Jump Game","Operative",["greedy","arrays"],
    "Given `N` non-negative integers where each represents max jump length from that position, determine if you can reach the last index. Print `Yes` or `No`.",
    "1 ≤ N ≤ 10^5",
    "5\n2 3 1 1 4","Yes",
    [["5\n2 3 1 1 4","Yes"],["5\n3 2 1 0 4","No"],["1\n0","Yes"]]),

  P("Jump Game II","Operative",["greedy"],
    "Given `N` non-negative integers, find the minimum number of jumps to reach the last index. It's guaranteed you can reach it.",
    "1 ≤ N ≤ 10^5",
    "5\n2 3 1 1 4","2",
    [["5\n2 3 1 1 4","2"],["1\n0","0"],["5\n1 1 1 1 1","4"]]),

  P("Gas Station","Operative",["greedy"],
    "There are `N` gas stations in a circle with `gas[i]` fuel and `cost[i]` to travel to next station. Find the starting station index (0-based) to complete the circuit, or `-1`.",
    "1 ≤ N ≤ 10^5",
    "5\n1 2 3 4 5\n3 4 5 1 2","3",
    [["5\n1 2 3 4 5\n3 4 5 1 2","3"],["3\n2 3 4\n3 4 3","-1"]]),

  P("Candy Distribution","Operative",["greedy"],
    "Each child has a rating. Give candies such that: each child gets ≥ 1, higher-rated child gets more than neighbors. Find minimum total candies.",
    "1 ≤ N ≤ 10^5; 0 ≤ rating_i ≤ 10^5",
    "3\n1 0 2","5",
    [["3\n1 0 2","5"],["4\n1 2 2 1","6"],["1\n5","1"]]),

  P("Task Scheduler","Operative",["greedy","hashing"],
    "Given tasks as letters and cooldown `N`, find the minimum intervals to complete all tasks.",
    "1 ≤ tasks ≤ 10^4; 0 ≤ N ≤ 100",
    "12 2\nA A A A A A B B B C C C","16",
    [["12 2\nA A A A A A B B B C C C","16"],["6 0\nA A A B B B","6"]]),

  P("Minimum Platforms","Operative",["greedy","sorting"],
    "Given arrival and departure times of `N` trains, find the minimum platforms needed.",
    "1 ≤ N ≤ 10^5; times are integers",
    "6\n900 940 950 1100 1500 1800\n910 1200 1120 1130 1900 2000","3",
    [["6\n900 940 950 1100 1500 1800\n910 1200 1120 1130 1900 2000","3"],["1\n100\n200","1"]]),

  P("Fractional Knapsack","Operative",["greedy","sorting"],
    "Given `N` items with value and weight, and capacity `W`, maximize value (fractions allowed). Print answer to 2 decimal places.",
    "1 ≤ N ≤ 10^5; 1 ≤ W ≤ 10^9",
    "3 50\n60 10\n100 20\n120 30","240.00",
    [["3 50\n60 10\n100 20\n120 30","240.00"],["1 5\n10 10","5.00"]]),

  // ---- RECURSION ----
  P("Generate Parentheses","Operative",["recursion","backtracking"],
    "Generate all combinations of `N` pairs of well-formed parentheses, one per line in lexicographic order.",
    "1 ≤ N ≤ 8",
    "3","((()))\n(()())\n(())()\n()(())\n()()()",
    [["3","((()))\n(()())\n(())()\n()(())\n()()()"],["1","()"],["2","(())\n()()"]]),

  P("Subsets","Operative",["recursion","backtracking"],
    "Given `N` distinct integers, print all subsets (power set), one per line, in lexicographic order. Empty set is first (print empty line).",
    "0 ≤ N ≤ 10",
    "3\n1 2 3","\n1\n1 2\n1 2 3\n1 3\n2\n2 3\n3",
    [["3\n1 2 3","\n1\n1 2\n1 2 3\n1 3\n2\n2 3\n3"],["1\n5","\n5"]]),

  P("Permutations","Operative",["recursion","backtracking"],
    "Given `N` distinct integers, print all permutations, one per line, in lexicographic order.",
    "1 ≤ N ≤ 8",
    "3\n1 2 3","1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1",
    [["3\n1 2 3","1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1"],["2\n1 2","1 2\n2 1"]]),

  P("Combination Sum","Operative",["recursion","backtracking"],
    "Given `N` distinct positive integers and target `T`, find all unique combinations that sum to `T`. Elements can be reused. Print each combination sorted, one per line.",
    "1 ≤ N ≤ 30; 1 ≤ T ≤ 200",
    "4 7\n2 3 6 7","2 2 3\n7",
    [["4 7\n2 3 6 7","2 2 3\n7"],["3 8\n2 3 5","2 3 3\n3 5"]]),

  P("Letter Combinations of Phone","Operative",["recursion","backtracking"],
    "Given a string of digits (2-9), return all possible letter combinations that the number could represent (phone keypad). Print each on a new line, lexicographic order.",
    "0 ≤ |digits| ≤ 4",
    "23","ad\nae\naf\nbd\nbe\nbf\ncd\nce\ncf",
    [["23","ad\nae\naf\nbd\nbe\nbf\ncd\nce\ncf"],["2","a\nb\nc"]]),

  // ---- BIT MANIPULATION ----
  P("Single Number","Operative",["bit-manipulation"],
    "Every element appears twice except one. Find the single element.",
    "1 ≤ N ≤ 10^5; N is odd",
    "5\n2 2 1 3 3","1",
    [["5\n2 2 1 3 3","1"],["1\n5","5"],["7\n4 1 2 1 2 4 7","7"]]),

  P("Number of 1 Bits Range","Operative",["bit-manipulation","dp"],
    "For each integer from `0` to `N`, print the number of 1-bits in its binary form.",
    "0 ≤ N ≤ 10^5",
    "5","0 1 1 2 1 2",
    [["5","0 1 1 2 1 2"],["0","0"],["2","0 1 1"]]),

  P("Reverse Bits","Operative",["bit-manipulation"],
    "Given a 32-bit unsigned integer, reverse its bits and print the result.",
    "0 ≤ N ≤ 2^32 - 1",
    "43261596","964176192",
    [["43261596","964176192"],["0","0"],["4294967295","4294967295"]]),

  P("Missing Number XOR","Operative",["bit-manipulation"],
    "Array contains `N` distinct numbers from `0` to `N`. Find the missing one using XOR.",
    "1 ≤ N ≤ 10^6",
    "4\n3 0 1","2",
    [["4\n3 0 1","2"],["3\n0 1","2"],["2\n1 0\n","Missing from 0..2: answer is 2"]]),

  P("Power Set Using Bits","Operative",["bit-manipulation"],
    "Given `N` distinct integers, generate all subsets using bit manipulation. Print count of subsets.",
    "0 ≤ N ≤ 20",
    "3","8",
    [["3","8"],["0","1"],["10","1024"]]),

  // ---- GRAPH BASICS ----
  P("BFS Traversal","Operative",["graphs","bfs"],
    "Given `N` nodes, `M` edges (undirected), and start node `S`, print BFS traversal order. If multiple neighbors, visit the smallest first.",
    "1 ≤ N ≤ 10^5; 0 ≤ M ≤ 2×10^5",
    "5 4 1\n1 2\n1 3\n2 4\n3 5","1 2 3 4 5",
    [["5 4 1\n1 2\n1 3\n2 4\n3 5","1 2 3 4 5"],["3 2 1\n1 2\n1 3","1 2 3"]]),

  P("DFS Traversal","Operative",["graphs","dfs"],
    "Given `N` nodes, `M` edges (undirected), and start node `S`, print DFS traversal order. Visit smallest neighbor first.",
    "1 ≤ N ≤ 10^5; 0 ≤ M ≤ 2×10^5",
    "5 4 1\n1 2\n1 3\n2 4\n3 5","1 2 4 3 5",
    [["5 4 1\n1 2\n1 3\n2 4\n3 5","1 2 4 3 5"],["3 2 1\n1 2\n1 3","1 2 3"]]),

  P("Connected Components","Operative",["graphs","bfs"],
    "Given `N` nodes and `M` edges (undirected), find the number of connected components.",
    "1 ≤ N ≤ 10^5; 0 ≤ M ≤ 2×10^5",
    "5 3\n1 2\n2 3\n4 5","2",
    [["5 3\n1 2\n2 3\n4 5","2"],["4 0","4"],["3 3\n1 2\n2 3\n1 3","1"]]),

  P("Detect Cycle Undirected","Operative",["graphs","bfs"],
    "Given an undirected graph with `N` nodes and `M` edges, print `Yes` if it contains a cycle, else `No`.",
    "1 ≤ N ≤ 10^5; 0 ≤ M ≤ 2×10^5",
    "4 4\n1 2\n2 3\n3 4\n4 1","Yes",
    [["4 4\n1 2\n2 3\n3 4\n4 1","Yes"],["3 2\n1 2\n2 3","No"]]),

  P("Bipartite Check","Operative",["graphs","bfs"],
    "Given `N` nodes and `M` edges (undirected), determine if the graph is bipartite. Print `Yes` or `No`.",
    "1 ≤ N ≤ 10^5; 0 ≤ M ≤ 2×10^5",
    "4 4\n1 2\n2 3\n3 4\n4 1","Yes",
    [["4 4\n1 2\n2 3\n3 4\n4 1","Yes"],["3 3\n1 2\n2 3\n1 3","No"]]),

  P("Topological Sort","Operative",["graphs","dfs"],
    "Given a DAG with `N` nodes and `M` directed edges, print a valid topological ordering.",
    "1 ≤ N ≤ 10^5; 0 ≤ M ≤ 2×10^5",
    "4 3\n1 2\n1 3\n2 4","1 2 3 4",
    [["4 3\n1 2\n1 3\n2 4","1 2 3 4"],["3 2\n1 2\n1 3","1 2 3"],["1 0","1"]]),

  P("Shortest Path Unweighted","Operative",["graphs","bfs"],
    "Given an unweighted undirected graph and source `S`, print the shortest distance from `S` to every node (−1 if unreachable).",
    "1 ≤ N ≤ 10^5; 0 ≤ M ≤ 2×10^5",
    "5 4 1\n1 2\n1 3\n2 4\n3 5","0 1 1 2 2",
    [["5 4 1\n1 2\n1 3\n2 4\n3 5","0 1 1 2 2"],["3 1 1\n1 2","0 1 -1"]]),

  P("Number of Islands","Operative",["graphs","bfs","matrix"],
    "Given an `M×N` grid of '1' (land) and '0' (water), count the number of islands (connected groups of land cells, 4-directionally).",
    "1 ≤ M, N ≤ 300",
    "4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0","1",
    [["4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0","1"],["4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1","3"]]),

  P("Flood Fill","Operative",["graphs","bfs","matrix"],
    "Given an `M×N` image grid, start pixel `(sr, sc)`, and new color, perform flood fill (change the pixel and all 4-connected same-color pixels to new color). Print the modified grid.",
    "1 ≤ M, N ≤ 50",
    "3 3 1 1 2\n1 1 1\n1 1 0\n1 0 1","2 2 2\n2 2 0\n2 0 1",
    [["3 3 1 1 2\n1 1 1\n1 1 0\n1 0 1","2 2 2\n2 2 0\n2 0 1"]]),

  P("Surrounded Regions","Operative",["graphs","bfs","matrix"],
    "Given an `M×N` board of 'X' and 'O', capture all regions of 'O' that are surrounded by 'X' (not on the border). Print modified board.",
    "1 ≤ M, N ≤ 200",
    "4 4\nX X X X\nX O O X\nX X O X\nX O X X","X X X X\nX X X X\nX X X X\nX O X X",
    [["4 4\nX X X X\nX O O X\nX X O X\nX O X X","X X X X\nX X X X\nX X X X\nX O X X"]]),

  // ---- MATRIX / MISC OPERATIVE ----
  P("Set Matrix Zeroes","Operative",["arrays","matrix"],
    "Given an `M×N` matrix, if an element is 0, set its entire row and column to 0. Print the result.",
    "1 ≤ M, N ≤ 200",
    "3 3\n1 1 1\n1 0 1\n1 1 1","1 0 1\n0 0 0\n1 0 1",
    [["3 3\n1 1 1\n1 0 1\n1 1 1","1 0 1\n0 0 0\n1 0 1"],["2 2\n0 1\n1 1","0 0\n0 1"]]),

  P("Search 2D Matrix","Operative",["binary-search","matrix"],
    "Given an `M×N` matrix where each row is sorted and the first element of each row > last element of previous row, find if target exists. Print `Yes` or `No`.",
    "1 ≤ M, N ≤ 100",
    "3 4 3\n1 3 5 7\n10 11 16 20\n23 30 34 60","Yes",
    [["3 4 3\n1 3 5 7\n10 11 16 20\n23 30 34 60","Yes"],["3 4 13\n1 3 5 7\n10 11 16 20\n23 30 34 60","No"]]),

  P("Game of Life","Operative",["simulation","matrix"],
    "Given an `M×N` binary grid (cells alive=1 or dead=0), compute the next state. Rules: live cell with 2-3 neighbors survives, dead cell with exactly 3 neighbors becomes alive.",
    "1 ≤ M, N ≤ 25",
    "4 3\n0 1 0\n0 0 1\n1 1 1\n0 0 0","0 0 0\n1 0 1\n0 1 1\n0 1 0",
    [["4 3\n0 1 0\n0 0 1\n1 1 1\n0 0 0","0 0 0\n1 0 1\n0 1 1\n0 1 0"]]),

  P("Rotate Image","Operative",["matrix"],
    "Rotate an `N×N` matrix 90° clockwise in-place. Print the result.",
    "1 ≤ N ≤ 100",
    "3\n1 2 3\n4 5 6\n7 8 9","7 4 1\n8 5 2\n9 6 3",
    [["3\n1 2 3\n4 5 6\n7 8 9","7 4 1\n8 5 2\n9 6 3"],["2\n1 2\n3 4","3 1\n4 2"]]),

  P("String to Integer (atoi)","Operative",["strings","simulation"],
    "Implement string-to-integer conversion with these rules: skip leading whitespace, optional `+`/`-` sign, read digits until non-digit. Clamp to 32-bit signed range [-2^31, 2^31-1]. Print the integer.",
    "0 ≤ |S| ≤ 200",
    "   -42","-42",
    [["   -42","-42"],["4193 with words","4193"],["words and 987","0"],["","0"],["-91283472332","-2147483648"]]),

  P("Merge Intervals","Operative",["sorting","arrays"],
    "Given `N` intervals `[start, end]`, merge overlapping intervals. Print merged intervals, one per line.",
    "1 ≤ N ≤ 10^5",
    "4\n1 3\n2 6\n8 10\n15 18","1 6\n8 10\n15 18",
    [["4\n1 3\n2 6\n8 10\n15 18","1 6\n8 10\n15 18"],["2\n1 4\n4 5","1 5"]]),

  P("Insert Interval","Operative",["sorting","arrays"],
    "Given `N` non-overlapping sorted intervals and a new interval, insert and merge as needed. Print the result.",
    "0 ≤ N ≤ 10^4",
    "5\n1 2\n3 5\n6 7\n8 10\n12 16\n4 8","1 2\n3 10\n12 16",
    [["5\n1 2\n3 5\n6 7\n8 10\n12 16\n4 8","1 2\n3 10\n12 16"],["0\n\n5 7","5 7"]]),

  P("LRU Cache","Operative",["design","hashing"],
    "Implement an LRU cache with capacity `C`. Operations: `get key` (return value or -1), `put key value` (evict LRU if full). Print each `get` result.",
    "1 ≤ C ≤ 3000; 1 ≤ ops ≤ 10^4",
    "2 9\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1\nget 3\nget 4","1\n-1\n-1\n3\n4",
    [["2 9\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1\nget 3\nget 4","1\n-1\n-1\n3\n4"]]),

  P("Maximum Frequency Stack","Operative",["design","stack","hashing"],
    "Implement a FreqStack: `push x` adds x. `pop` removes and returns the most frequent element. Ties broken by most recent push. Print each `pop` result.",
    "1 ≤ ops ≤ 10^4",
    "10\npush 5\npush 7\npush 5\npush 7\npush 4\npush 5\npop\npop\npop\npop","5\n7\n5\n4",
    [["10\npush 5\npush 7\npush 5\npush 7\npush 4\npush 5\npop\npop\npop\npop","5\n7\n5\n4"]]),

  P("Count Primes Sieve","Operative",["math","number-theory"],
    "Count the number of primes less than `N` using the Sieve of Eratosthenes.",
    "0 ≤ N ≤ 5×10^6",
    "10","4",
    [["10","4"],["0","0"],["1","0"],["2","0"],["100","25"]]),

  P("Next Permutation","Operative",["arrays","math"],
    "Given `N` integers, rearrange them to the next lexicographically greater permutation. If it's the last permutation, rearrange to the first (sorted ascending).",
    "1 ≤ N ≤ 10^5",
    "3\n1 2 3","1 3 2",
    [["3\n1 2 3","1 3 2"],["3\n3 2 1","1 2 3"],["4\n1 3 5 4","1 4 3 5"]]),

  P("Spiral Matrix II","Operative",["matrix","simulation"],
    "Given `N`, generate an `N×N` matrix filled with elements from 1 to N² in spiral order. Print it.",
    "1 ≤ N ≤ 20",
    "3","1 2 3\n8 9 4\n7 6 5",
    [["3","1 2 3\n8 9 4\n7 6 5"],["1","1"],["2","1 2\n4 3"]]),

  P("Pow(x, n)","Operative",["math","recursion"],
    "Implement `pow(x, n)` using fast exponentiation. Print result to 5 decimal places.",
    "|x| ≤ 100; −2^31 ≤ n ≤ 2^31−1",
    "2.00000 10","1024.00000",
    [["2.00000 10","1024.00000"],["2.10000 3","9.26100"],["2.00000 -2","0.25000"]]),

  P("Sqrt Decomposition Range Sum","Operative",["arrays","math"],
    "Given `N` integers and `Q` queries of type `1 i val` (update a[i]=val) or `2 l r` (sum from l to r inclusive, 0-based), process all queries. Print results of type 2.",
    "1 ≤ N, Q ≤ 10^5",
    "5\n1 3 5 7 9\n3\n2 1 3\n1 2 6\n2 1 3","15\n16",
    [["5\n1 3 5 7 9\n3\n2 1 3\n1 2 6\n2 1 3","15\n16"]]),

  // ---- MORE OPERATIVE TO FILL POOL ----
  P("String Multiply","Operative",["strings","math"],
    "Given two non-negative integers represented as strings, return their product as a string. Do not use BigInt or built-in multiplication for the whole numbers.",
    "1 ≤ |num1|, |num2| ≤ 200",
    "123\n456","56088",
    [["123\n456","56088"],["0\n0","0"],["99\n99","9801"]]),

  P("Count and Say","Operative",["strings","simulation"],
    "The count-and-say sequence: `1`, `11`, `21`, `1211`, `111221`, ... Each term describes the previous. Given `N`, print the Nth term.",
    "1 ≤ N ≤ 30",
    "4","1211",
    [["4","1211"],["1","1"],["5","111221"]]),

  P("Trapping Rain Water Optimized","Operative",["two-pointers","arrays"],
    "Given `N` bars, compute trapped rainwater using O(1) extra space.",
    "1 ≤ N ≤ 10^5; 0 ≤ h_i ≤ 10^5",
    "12\n0 1 0 2 1 0 1 3 2 1 2 1","6",
    [["12\n0 1 0 2 1 0 1 3 2 1 2 1","6"],["6\n4 2 0 3 2 5","9"]]),

  P("Flatten Binary Tree to List","Operative",["trees","recursion"],
    "Given a binary tree (level-order, -1=null), flatten it to a linked list (right pointers only, preorder). Print the values in order.",
    "1 ≤ nodes ≤ 10^4",
    "6\n1 2 5 3 4 6","1 2 3 4 5 6",
    [["6\n1 2 5 3 4 6","1 2 3 4 5 6"],["1\n1","1"]]),

  P("Kth Largest in Array","Operative",["arrays","sorting"],
    "Find the Kth largest element in an unsorted array.",
    "1 ≤ K ≤ N ≤ 10^5",
    "6 2\n3 2 1 5 6 4","5",
    [["6 2\n3 2 1 5 6 4","5"],["6 1\n3 2 1 5 6 4","6"],["3 3\n1 2 3","1"]]),

  P("Minimum Path Sum Grid","Operative",["dp","matrix"],
    "Given an `M×N` grid of non-negative integers, find a path from top-left to bottom-right minimizing the sum. Only move right or down.",
    "1 ≤ M, N ≤ 200",
    "3 3\n1 3 1\n1 5 1\n4 2 1","7",
    [["3 3\n1 3 1\n1 5 1\n4 2 1","7"],["2 2\n1 2\n3 4","7"],["1 1\n5","5"]]),

  P("Course Schedule","Operative",["graphs","topological-sort"],
    "Given `N` courses and prerequisites, determine if you can finish all courses. Print `Yes` or `No`.",
    "1 ≤ N ≤ 2000; 0 ≤ prerequisites ≤ 5000",
    "4 4\n1 0\n2 0\n3 1\n3 2","Yes",
    [["4 4\n1 0\n2 0\n3 1\n3 2","Yes"],["2 2\n1 0\n0 1","No"]]),

  P("Rotate List","Operative",["linked-list"],
    "Given a linked list and `K`, rotate the list to the right by `K` places. Print the result.",
    "0 ≤ K ≤ 2×10^9; 0 ≤ N ≤ 500",
    "5 2\n1 2 3 4 5","4 5 1 2 3",
    [["5 2\n1 2 3 4 5","4 5 1 2 3"],["3 4\n0 1 2","2 0 1"]]),

  P("Add Two Numbers as Lists","Operative",["linked-list","math"],
    "Two non-negative integers stored as reversed linked lists (digits in reverse). Add them and return the sum as a reversed linked list.",
    "1 ≤ digits ≤ 100",
    "3\n2 4 3\n3\n5 6 4","7 0 8",
    [["3\n2 4 3\n3\n5 6 4","7 0 8"],["1\n0\n1\n0","0"],["3\n9 9 9\n1\n1","0 0 0 1"]]),

  P("Max Area of Island","Operative",["graphs","bfs","matrix"],
    "Given an `M×N` binary grid, find the maximum area (number of 1s) of an island.",
    "1 ≤ M, N ≤ 50",
    "4 5\n0 0 1 0 0\n0 0 1 1 0\n0 1 1 0 0\n0 0 0 0 0","5",
    [["4 5\n0 0 1 0 0\n0 0 1 1 0\n0 1 1 0 0\n0 0 0 0 0","5"],["2 2\n0 0\n0 0","0"]]),

  P("Longest Repeating Character Replacement","Operative",["sliding-window","strings"],
    "Given string `S` (uppercase letters) and `K`, find the length of the longest substring with at most `K` character replacements making all characters the same.",
    "1 ≤ |S| ≤ 10^5; 0 ≤ K ≤ |S|",
    "AABABBA\n1","4",
    [["AABABBA\n1","4"],["ABAB\n2","4"],["AAAA\n0","4"]]),

  P("Find All Duplicates","Operative",["arrays"],
    "Given `N` integers where each is in [1, N] and each appears once or twice, find all elements that appear twice. Print them sorted.",
    "1 ≤ N ≤ 10^5",
    "8\n4 3 2 7 8 2 3 1","2 3",
    [["8\n4 3 2 7 8 2 3 1","2 3"],["3\n1 2 3",""],["4\n1 1 2 2","1 2"]]),

  P("Maximal Square","Operative",["dp","matrix"],
    "Given an `M×N` binary matrix, find the area of the largest square containing only 1s.",
    "1 ≤ M, N ≤ 300",
    "4 5\n1 0 1 0 0\n1 0 1 1 1\n1 1 1 1 1\n1 0 0 1 0","4",
    [["4 5\n1 0 1 0 0\n1 0 1 1 1\n1 1 1 1 1\n1 0 0 1 0","4"],["2 2\n0 0\n0 0","0"],["1 1\n1","1"]]),

  P("Clone Graph","Operative",["graphs","hashing"],
    "Given an adjacency list of an undirected graph, clone it. Print the adjacency list of the clone.",
    "1 ≤ N ≤ 100",
    "4\n2 4\n1 3\n2 4\n1 3","2 4\n1 3\n2 4\n1 3",
    [["4\n2 4\n1 3\n2 4\n1 3","2 4\n1 3\n2 4\n1 3"]]),

  P("H-Index","Operative",["sorting","binary-search"],
    "Given `N` citation counts, find the h-index: largest `h` such that `h` papers have ≥ `h` citations.",
    "1 ≤ N ≤ 5000",
    "5\n3 0 6 1 5","3",
    [["5\n3 0 6 1 5","3"],["1\n100","1"],["3\n0 0 0","0"]]),

  P("Product of Array Except Self","Operative",["arrays"],
    "Given `N` integers, for each element output the product of all other elements without using division. O(N) time.",
    "2 ≤ N ≤ 10^5; |a_i| ≤ 30",
    "4\n1 2 3 4","24 12 8 6",
    [["4\n1 2 3 4","24 12 8 6"],["4\n-1 1 0 -3","0 0 3 0"]]),

  P("Minimum Size Subarray Sum","Operative",["sliding-window","arrays"],
    "Given `N` positive integers and target `S`, find the minimal length of a contiguous subarray with sum ≥ S. Print `0` if impossible.",
    "1 ≤ N ≤ 10^5",
    "6 7\n2 3 1 2 4 3","2",
    [["6 7\n2 3 1 2 4 3","2"],["3 11\n1 2 3","0"],["3 4\n1 4 4","1"]]),

  P("Kth Smallest in BST","Operative",["trees","recursion"],
    "Given a BST (level-order, -1=null) and `K`, find the Kth smallest element.",
    "1 ≤ K ≤ nodes ≤ 10^4",
    "5 3\n5 3 6 2 4","4",
    [["5 3\n5 3 6 2 4","4"],["1 1\n1","1"]]),

  P("Construct Tree from Inorder+Preorder","Operative",["trees","recursion","hashing"],
    "Given inorder and preorder traversals, construct the binary tree and print its level-order traversal (-1 for null at non-leaf positions).",
    "1 ≤ N ≤ 10^4; values are distinct",
    "5\n4 2 5 1 3\n1 2 4 5 3","1 2 3 4 5",
    [["5\n4 2 5 1 3\n1 2 4 5 3","1 2 3 4 5"]]),

  P("Serialize and Deserialize BST","Operative",["trees","design"],
    "Given a BST (level-order, -1=null), serialize it to a string and deserialize it back. Print the level-order of the deserialized tree.",
    "1 ≤ nodes ≤ 10^4",
    "5\n2 1 3 -1 -1","2 1 3",
    [["5\n2 1 3 -1 -1","2 1 3"]]),

  P("Pacific Atlantic Water Flow","Operative",["graphs","bfs","matrix"],
    "Given an `M×N` height matrix near ocean borders (top/left = Pacific, bottom/right = Atlantic), find cells from which water can flow to both oceans. Print coordinates sorted.",
    "1 ≤ M, N ≤ 200",
    "5 5\n1 2 2 3 5\n3 2 3 4 4\n2 4 5 3 1\n6 7 1 4 5\n5 1 1 2 4","0 4\n1 3\n1 4\n2 2\n3 0\n3 1\n4 0",
    [["5 5\n1 2 2 3 5\n3 2 3 4 4\n2 4 5 3 1\n6 7 1 4 5\n5 1 1 2 4","0 4\n1 3\n1 4\n2 2\n3 0\n3 1\n4 0"]]),

  P("Reorganize String","Operative",["greedy","hashing","strings"],
    "Given string `S`, rearrange so no two adjacent characters are the same. Print any valid arrangement, or `-1` if impossible.",
    "1 ≤ |S| ≤ 500",
    "aab","aba",
    [["aab","aba"],["aaab","-1"],["vvvlo","vlvov"]]),

  P("Min Cost Climbing Stairs","Operative",["dp"],
    "Given `N` stair costs, you can start from step 0 or 1. Each step you can climb 1 or 2 stairs. Find the minimum cost to reach the top.",
    "2 ≤ N ≤ 1000",
    "3\n10 15 20","15",
    [["3\n10 15 20","15"],["10\n1 100 1 1 1 100 1 1 100 1","6"]]),

  P("Palindrome Partitioning Count","Operative",["dp","strings"],
    "Given string `S`, find the minimum number of cuts to partition it such that each substring is a palindrome.",
    "1 ≤ |S| ≤ 2000",
    "aab","1",
    [["aab","1"],["a","0"],["aaaa","0"],["abcba","0"],["abcd","3"]]),

  P("Ugly Number II","Operative",["dp","math"],
    "Find the Nth ugly number (whose prime factors are limited to 2, 3, 5). The sequence: 1, 2, 3, 4, 5, 6, 8, 9, 10, 12, ...",
    "1 ≤ N ≤ 1690",
    "10","12",
    [["10","12"],["1","1"],["7","8"],["1690","2123366400"]]),

  P("Maximum Width of Binary Tree","Operative",["trees","bfs"],
    "Width = number of positions between leftmost and rightmost non-null nodes at each level (including nulls between them). Find the maximum width.",
    "1 ≤ nodes ≤ 3000",
    "7\n1 3 2 5 -1 -1 9","4",
    [["7\n1 3 2 5 -1 -1 9","4"],["1\n1","1"],["5\n1 3 2 5 3","2"]]),
];

// ========================================================================
//  ELITE POOL
// ========================================================================
const ELITE = [
  // ---- ADVANCED DP ----
  P("Longest Palindromic Subsequence","Elite",["dp","strings"],
    "Given string `S`, find the length of the longest palindromic subsequence.",
    "1 ≤ |S| ≤ 1000",
    "bbbab","4",
    [["bbbab","4"],["cbbd","2"],["abcba","5"],["a","1"]]),

  P("Burst Balloons","Elite",["dp"],
    "Given `N` balloons with values, bursting balloon `i` gives `val[left] × val[i] × val[right]`. Find the maximum coins you can collect by bursting all balloons. Assume `val[-1] = val[N] = 1`.",
    "1 ≤ N ≤ 500",
    "4\n3 1 5 8","167",
    [["4\n3 1 5 8","167"],["1\n5","5"]]),

  P("Regular Expression Matching","Elite",["dp","strings"],
    "Implement regex matching with `.` (any single char) and `*` (zero or more of preceding). Print `Yes` if full match, else `No`.",
    "0 ≤ |S| ≤ 20; 0 ≤ |P| ≤ 30",
    "aab\nc*a*b","Yes",
    [["aab\nc*a*b","Yes"],["aa\na","No"],["ab\n.*","Yes"],["mississippi\nmis*is*p*.","No"]]),

  P("Wildcard Matching","Elite",["dp","strings"],
    "Implement wildcard matching with `?` (any single char) and `*` (any sequence including empty). Print `Yes` or `No`.",
    "0 ≤ |S|, |P| ≤ 2000",
    "adceb\n*a*b","Yes",
    [["adceb\n*a*b","Yes"],["cb\n?a","No"],["acdcb\na*c?b","No"]]),

  P("Interleaving String","Elite",["dp","strings"],
    "Given `S1`, `S2`, and `S3`, determine if `S3` is formed by interleaving `S1` and `S2`. Print `Yes` or `No`.",
    "0 ≤ |S1|, |S2| ≤ 100; |S3| = |S1| + |S2|",
    "aabcc\ndbbca\naadbbcbcac","Yes",
    [["aabcc\ndbbca\naadbbcbcac","Yes"],["abc\ndef\nabdecf","No"]]),

  P("Distinct Subsequences","Elite",["dp","strings"],
    "Given strings `S` and `T`, count the number of distinct subsequences of `S` that equal `T`.",
    "1 ≤ |S|, |T| ≤ 1000",
    "rabbbit\nrabbit","3",
    [["rabbbit\nrabbit","3"],["babgbag\nbag","5"]]),

  P("Palindrome Partitioning II","Elite",["dp","strings"],
    "Given string `S`, find the minimum cuts needed for palindrome partitioning.",
    "1 ≤ |S| ≤ 2000",
    "aab","1",
    [["aab","1"],["a","0"],["ab","1"]]),

  P("Egg Drop Problem","Elite",["dp","binary-search"],
    "Given `K` eggs and `N` floors, find the minimum number of trials to find the critical floor.",
    "1 ≤ K ≤ 100; 1 ≤ N ≤ 10^4",
    "2 10","4",
    [["2 10","4"],["1 5","5"],["2 6","3"],["3 14","4"]]),

  P("Matrix Chain Multiplication","Elite",["dp"],
    "Given dimensions of `N` matrices (array of N+1 integers), find the minimum number of scalar multiplications to multiply all matrices.",
    "1 ≤ N ≤ 100",
    "4\n40 20 30 10 30","26000",
    [["4\n40 20 30 10 30","26000"],["3\n10 30 5 60","4500"]]),

  P("Longest Valid Parentheses","Elite",["dp","stack"],
    "Given a string of `(` and `)`, find the length of the longest valid parentheses substring.",
    "0 ≤ |S| ≤ 3×10^4",
    "(()","2",
    [["(()","2"],[")()())","4"],["","0"],["()(()","2"]]),

  P("Minimum Window Subsequence","Elite",["dp","two-pointers"],
    "Given strings `S` and `T`, find the shortest substring of `S` that contains `T` as a subsequence. Print the substring, or empty if none.",
    "1 ≤ |S| ≤ 2×10^4; 1 ≤ |T| ≤ 100",
    "abcdebdde\nbde","bcde",
    [["abcdebdde\nbde","bcde"],["jmeqksfrsdcmsiwvaovztaqenrydcbahesctspfaqkjhntasl\nu",""]]),

  P("Coin Change II (Count Ways)","Elite",["dp"],
    "Given `N` coin denominations and amount `A`, count the number of combinations that make up `A`.",
    "1 ≤ N ≤ 300; 0 ≤ A ≤ 5000",
    "3 5\n1 2 5","4",
    [["3 5\n1 2 5","4"],["1 3\n2","0"],["3 0\n1 2 5","1"]]),

  P("Maximum Profit in Job Scheduling","Elite",["dp","binary-search","sorting"],
    "Given `N` jobs with start time, end time, and profit, find the maximum profit from non-overlapping jobs.",
    "1 ≤ N ≤ 5×10^4",
    "4\n1 2 3 3\n3 4 5 6\n50 10 40 70","120",
    [["4\n1 2 3 3\n3 4 5 6\n50 10 40 70","120"],["3\n1 1 1\n2 3 4\n5 6 4","6"]]),

  P("Minimum Cost to Cut a Stick","Elite",["dp"],
    "Given a stick of length `N` and `C` cut positions, find the minimum cost to make all cuts (cost of a cut = length of the stick being cut).",
    "2 ≤ N ≤ 10^6; 1 ≤ C ≤ 100",
    "7 4\n1 3 4 5","16",
    [["7 4\n1 3 4 5","16"],["9 2\n5 6","13"]]),

  P("Cherry Pickup","Elite",["dp","matrix"],
    "Given an `N×N` grid with cherries (1), empty (0), and thorns (-1), find the maximum cherries collected going from (0,0) to (N-1,N-1) and back. You can only move right/down going, left/up returning.",
    "1 ≤ N ≤ 50",
    "3\n0 1 -1\n1 0 -1\n1 1 1","5",
    [["3\n0 1 -1\n1 0 -1\n1 1 1","5"],["1\n1","1"]]),

  // ---- GRAPH ALGORITHMS ----
  P("Dijkstra Shortest Path","Elite",["graphs","greedy"],
    "Given a weighted directed graph with `N` nodes and `M` edges, and source `S`, find shortest distances to all nodes. Print `-1` for unreachable.",
    "1 ≤ N ≤ 10^5; 0 ≤ M ≤ 2×10^5; 0 ≤ weight ≤ 10^6",
    "5 6 1\n1 2 2\n1 3 4\n2 3 1\n2 4 7\n3 5 3\n4 5 1","0 2 3 9 6",
    [["5 6 1\n1 2 2\n1 3 4\n2 3 1\n2 4 7\n3 5 3\n4 5 1","0 2 3 9 6"]]),

  P("Bellman-Ford","Elite",["graphs"],
    "Given a weighted directed graph and source `S`, find shortest distances. Detect negative cycles — print `NEGATIVE CYCLE` if one exists.",
    "1 ≤ N ≤ 500; 0 ≤ M ≤ 5000",
    "5 5 1\n1 2 -1\n1 3 4\n2 3 3\n2 4 2\n4 2 1","0 -1 2 1 INF",
    [["5 5 1\n1 2 -1\n1 3 4\n2 3 3\n2 4 2\n4 2 1","0 -1 2 1 INF"]]),

  P("Floyd-Warshall","Elite",["graphs","dp"],
    "Given `N` nodes and a weighted adjacency matrix (`-1` = no edge), compute all-pairs shortest paths. Print the result matrix (`-1` for unreachable).",
    "1 ≤ N ≤ 400",
    "4\n0 3 -1 7\n8 0 2 -1\n5 -1 0 1\n2 -1 -1 0","0 3 5 6\n5 0 2 3\n3 6 0 1\n2 5 7 0",
    [["4\n0 3 -1 7\n8 0 2 -1\n5 -1 0 1\n2 -1 -1 0","0 3 5 6\n5 0 2 3\n3 6 0 1\n2 5 7 0"]]),

  P("Kruskal's MST","Elite",["graphs","union-find","greedy"],
    "Given `N` nodes and `M` weighted undirected edges, find the total weight of the Minimum Spanning Tree.",
    "1 ≤ N ≤ 10^5; N−1 ≤ M ≤ 2×10^5",
    "4 5\n1 2 10\n1 3 6\n1 4 5\n2 4 15\n3 4 4","15",
    [["4 5\n1 2 10\n1 3 6\n1 4 5\n2 4 15\n3 4 4","15"],["3 3\n1 2 1\n2 3 2\n1 3 3","3"]]),

  P("Strongly Connected Components","Elite",["graphs","dfs"],
    "Given a directed graph with `N` nodes and `M` edges, find the number of Strongly Connected Components.",
    "1 ≤ N ≤ 10^5; 0 ≤ M ≤ 2×10^5",
    "5 5\n1 2\n2 3\n3 1\n3 4\n4 5","3",
    [["5 5\n1 2\n2 3\n3 1\n3 4\n4 5","3"],["3 3\n1 2\n2 3\n3 1","1"]]),

  P("Articulation Points","Elite",["graphs","dfs"],
    "Given an undirected graph with `N` nodes and `M` edges, find all articulation points (removal disconnects the graph). Print them sorted, or `NONE`.",
    "1 ≤ N ≤ 10^5; 0 ≤ M ≤ 2×10^5",
    "5 5\n1 2\n1 3\n2 3\n3 4\n4 5","3 4",
    [["5 5\n1 2\n1 3\n2 3\n3 4\n4 5","3 4"],["3 3\n1 2\n2 3\n1 3","NONE"]]),

  P("Bridges in Graph","Elite",["graphs","dfs"],
    "Given an undirected graph, find all bridges (edges whose removal increases components). Print edges sorted.",
    "1 ≤ N ≤ 10^5; 0 ≤ M ≤ 2×10^5",
    "5 5\n1 2\n1 3\n2 3\n3 4\n4 5","3 4\n4 5",
    [["5 5\n1 2\n1 3\n2 3\n3 4\n4 5","3 4\n4 5"],["3 3\n1 2\n2 3\n1 3","NONE"]]),

  P("Shortest Path in DAG","Elite",["graphs","topological-sort"],
    "Given a weighted DAG with `N` nodes, `M` edges, and source `S`, find shortest distances using topological sort.",
    "1 ≤ N ≤ 10^5; 0 ≤ M ≤ 2×10^5",
    "6 7 1\n1 2 2\n1 3 1\n2 4 3\n3 4 1\n3 5 6\n4 5 2\n5 6 1","0 2 1 2 4 5",
    [["6 7 1\n1 2 2\n1 3 1\n2 4 3\n3 4 1\n3 5 6\n4 5 2\n5 6 1","0 2 1 2 4 5"]]),

  P("Word Ladder","Elite",["graphs","bfs"],
    "Given `beginWord`, `endWord`, and a dictionary, find the shortest transformation sequence length (each step changes one letter, each intermediate word must be in dictionary). Print `0` if impossible.",
    "1 ≤ |words| ≤ 5000; |word| ≤ 10",
    "hit\ncog\n6\nhot dot dog lot log cog","5",
    [["hit\ncog\n6\nhot dot dog lot log cog","5"],["hit\ncog\n5\nhot dot dog lot log","0"]]),

  P("Alien Dictionary","Elite",["graphs","topological-sort"],
    "Given `N` words sorted in alien language order, determine the character ordering. Print characters in order, or `INVALID` if no valid ordering.",
    "1 ≤ N ≤ 100; 1 ≤ |word| ≤ 100",
    "5\nwrt\nwrf\ner\nett\nrftt","wertf",
    [["5\nwrt\nwrf\ner\nett\nrftt","wertf"],["2\nabc\nab","INVALID"]]),

  P("Cheapest Flights Within K Stops","Elite",["graphs","dp"],
    "Given `N` cities, `M` flights with prices, find the cheapest price from `src` to `dst` with at most `K` stops. Print `-1` if impossible.",
    "1 ≤ N ≤ 100; 0 ≤ M ≤ N(N-1)/2; 0 ≤ K < N",
    "4 4 0 3 1\n0 1 100\n1 2 100\n2 3 100\n0 3 500","300",
    [["4 4 0 3 1\n0 1 100\n1 2 100\n2 3 100\n0 3 500","300"],["3 1 0 2 0\n0 1 100","-1"]]),

  // ---- ADVANCED TREES ----
  P("Binary Tree Maximum Path Sum","Elite",["trees","dp"],
    "A path in a binary tree is any sequence of nodes connected by edges. Find the maximum sum path (can start and end at any node).",
    "1 ≤ nodes ≤ 3×10^4; |val| ≤ 1000",
    "3\n-10 9 20 -1 -1 15 7","42",
    [["3\n-10 9 20 -1 -1 15 7","42"],["3\n1 2 3","6"],["1\n-3","-3"]]),

  P("Count Complete Tree Nodes","Elite",["trees","binary-search"],
    "Given a complete binary tree (level-order, all levels full except possibly last which is filled left to right), count the nodes in O(log²N) time.",
    "0 ≤ nodes ≤ 5×10^4",
    "6\n1 2 3 4 5 6","6",
    [["6\n1 2 3 4 5 6","6"],["1\n1","1"]]),

  P("Recover BST","Elite",["trees","dfs"],
    "Two elements of a BST were swapped by mistake. Find and print the two swapped values (smaller first).",
    "2 ≤ nodes ≤ 1000",
    "3\n1 3 2","2 3",
    [["3\n1 3 2","2 3"],["4\n3 1 4 2","1 2"]]),

  P("Vertical Order Traversal","Elite",["trees","bfs","sorting"],
    "Print binary tree nodes in vertical order (left to right columns, top to bottom within column, sorted by value if same position).",
    "1 ≤ nodes ≤ 1000",
    "7\n3 9 20 -1 -1 15 7","9\n3 15\n20\n7",
    [["7\n3 9 20 -1 -1 15 7","9\n3 15\n20\n7"]]),

  P("All Nodes Distance K","Elite",["trees","bfs"],
    "Given a binary tree, target node value, and distance `K`, find all nodes at distance K from target. Print sorted.",
    "1 ≤ nodes ≤ 500; 0 ≤ K ≤ 1000",
    "7 5 2\n3 5 1 6 2 0 8\n-1 -1 7 4","1 7",
    [["7 5 2\n3 5 1 6 2 0 8\n-1 -1 7 4","1 7"]]),

  // ---- BACKTRACKING ----
  P("N-Queens","Elite",["backtracking"],
    "Place `N` queens on an N×N board so none threaten each other. Print the number of solutions.",
    "1 ≤ N ≤ 15",
    "8","92",
    [["8","92"],["4","2"],["1","1"],["13","73712"]]),

  P("Sudoku Solver","Elite",["backtracking"],
    "Given a 9×9 Sudoku board (0 = empty), solve it and print the completed board.",
    "Board has a unique solution",
    "9\n5 3 0 0 7 0 0 0 0\n6 0 0 1 9 5 0 0 0\n0 9 8 0 0 0 0 6 0\n8 0 0 0 6 0 0 0 3\n4 0 0 8 0 3 0 0 1\n7 0 0 0 2 0 0 0 6\n0 6 0 0 0 0 2 8 0\n0 0 0 4 1 9 0 0 5\n0 0 0 0 8 0 0 7 9","5 3 4 6 7 8 9 1 2\n6 7 2 1 9 5 3 4 8\n1 9 8 3 4 2 5 6 7\n8 5 9 7 6 1 4 2 3\n4 2 6 8 5 3 7 9 1\n7 1 3 9 2 4 8 5 6\n9 6 1 5 3 7 2 8 4\n2 8 7 4 1 9 6 3 5\n3 4 5 2 8 6 1 7 9",
    [["9\n5 3 0 0 7 0 0 0 0\n6 0 0 1 9 5 0 0 0\n0 9 8 0 0 0 0 6 0\n8 0 0 0 6 0 0 0 3\n4 0 0 8 0 3 0 0 1\n7 0 0 0 2 0 0 0 6\n0 6 0 0 0 0 2 8 0\n0 0 0 4 1 9 0 0 5\n0 0 0 0 8 0 0 7 9","5 3 4 6 7 8 9 1 2\n6 7 2 1 9 5 3 4 8\n1 9 8 3 4 2 5 6 7\n8 5 9 7 6 1 4 2 3\n4 2 6 8 5 3 7 9 1\n7 1 3 9 2 4 8 5 6\n9 6 1 5 3 7 2 8 4\n2 8 7 4 1 9 6 3 5\n3 4 5 2 8 6 1 7 9"]]),

  P("Word Search II","Elite",["backtracking","trie"],
    "Given an `M×N` board of characters and a list of words, find all words that can be formed by sequentially adjacent cells (no cell reused per word). Print found words sorted.",
    "1 ≤ M, N ≤ 12; 1 ≤ words ≤ 3×10^4",
    "4 4\no a a n\ne t a e\ni h k r\ni f l v\n4\noath pea eat rain","eat oath",
    [["4 4\no a a n\ne t a e\ni h k r\ni f l v\n4\noath pea eat rain","eat oath"]]),

  P("Partition to K Equal Sum Subsets","Elite",["backtracking"],
    "Given `N` integers and `K`, determine if the array can be divided into `K` non-empty subsets with equal sum. Print `Yes` or `No`.",
    "1 ≤ K ≤ N ≤ 16",
    "4 3\n4 3 2 3","Yes",
    [["4 3\n4 3 2 3","Yes"],["4 3\n1 2 3 4","No"]]),

  P("Hamiltonian Path","Elite",["backtracking","graphs"],
    "Given an undirected graph with `N` nodes and `M` edges, determine if a Hamiltonian path exists. Print `Yes` or `No`.",
    "1 ≤ N ≤ 20; 0 ≤ M ≤ N(N-1)/2",
    "5 5\n1 2\n2 3\n3 4\n4 5\n1 5","Yes",
    [["5 5\n1 2\n2 3\n3 4\n4 5\n1 5","Yes"],["5 3\n1 2\n3 4\n4 5","No"]]),

  P("Cryptarithmetic Solver","Elite",["backtracking"],
    "Given a cryptarithmetic puzzle `WORD1 + WORD2 = WORD3`, find digit assignments (0-9, distinct) so the equation holds. Leading digits can't be 0. Print the mapping as `LETTER=DIGIT` sorted by letter, or `NONE`.",
    "2 ≤ |WORD1|, |WORD2|, |WORD3| ≤ 8",
    "SEND\nMORE\nMONEY","D=7 E=5 M=1 N=6 O=0 R=8 S=9 Y=2",
    [["SEND\nMORE\nMONEY","D=7 E=5 M=1 N=6 O=0 R=8 S=9 Y=2"]]),

  // ---- ADVANCED STRING ALGORITHMS ----
  P("KMP Pattern Search","Elite",["strings","algorithms"],
    "Given text `T` and pattern `P`, find all occurrences of `P` in `T` using KMP. Print 0-based starting indices, or `-1` if none.",
    "1 ≤ |P| ≤ |T| ≤ 10^6",
    "AABAACAADAABAABA\nAABA","0 9 12",
    [["AABAACAADAABAABA\nAABA","0 9 12"],["ABCDEF\nGH","-1"]]),

  P("Z Algorithm","Elite",["strings","algorithms"],
    "Given string `S`, compute the Z-array where `Z[i]` = length of longest substring starting at `i` that matches a prefix of `S`. Print the Z-array (Z[0]=0 by convention).",
    "1 ≤ |S| ≤ 10^6",
    "aabxaa","0 1 0 0 2 1",
    [["aabxaa","0 1 0 0 2 1"],["aaaa","0 3 2 1"]]),

  P("Rabin-Karp Hashing","Elite",["strings","hashing"],
    "Given text `T` and pattern `P`, find all occurrences using Rabin-Karp rolling hash. Print 0-based indices or `-1`.",
    "1 ≤ |P| ≤ |T| ≤ 10^6",
    "abcabcabc\nabc","0 3 6",
    [["abcabcabc\nabc","0 3 6"],["hello\nworld","-1"]]),

  P("Longest Repeating Substring","Elite",["strings","binary-search","hashing"],
    "Given string `S`, find the length of the longest substring that occurs at least twice.",
    "1 ≤ |S| ≤ 10^4",
    "banana","3",
    [["banana","3"],["abcd","0"],["aaa","2"]]),

  P("Shortest Palindrome","Elite",["strings","algorithms"],
    "Given string `S`, find the shortest palindrome by adding characters only in front of `S`. Print the result.",
    "0 ≤ |S| ≤ 5×10^4",
    "aacecaaa","aaacecaaa",
    [["aacecaaa","aaacecaaa"],["abcd","dcbabcd"],["",""]]),

  // ---- NUMBER THEORY ADVANCED ----
  P("Modular Exponentiation","Elite",["math","number-theory"],
    "Compute `a^b mod m` efficiently.",
    "0 ≤ a, b ≤ 10^18; 1 ≤ m ≤ 10^9",
    "2 10 1000","24",
    [["2 10 1000","24"],["3 100 1000000007","981147432"],["0 0 1","0"]]),

  P("Euler Totient Function","Elite",["math","number-theory"],
    "Given `N`, compute φ(N) — the count of integers from 1 to N that are coprime with N.",
    "1 ≤ N ≤ 10^9",
    "12","4",
    [["12","4"],["1","1"],["7","6"],["100","40"]]),

  P("Chinese Remainder Theorem","Elite",["math","number-theory"],
    "Given `N` pairs `(remainder, modulus)` where moduli are pairwise coprime, find the smallest non-negative `x` satisfying all congruences.",
    "1 ≤ N ≤ 10; 1 ≤ mod_i ≤ 10^6",
    "3\n2 3\n3 5\n2 7","23",
    [["3\n2 3\n3 5\n2 7","23"],["2\n0 2\n0 3","0"]]),

  P("Segmented Sieve","Elite",["math","number-theory"],
    "Count primes in range `[L, R]` where values can be very large.",
    "1 ≤ L ≤ R ≤ 10^12; R - L ≤ 10^6",
    "10 30","6",
    [["10 30","6"],["1 10","4"],["999999999000 999999999100","2"]]),

  P("nCr Modulo Prime","Elite",["math","number-theory","dp"],
    "Compute `C(n, r) mod p` where `p` is a prime, using Lucas' theorem or modular inverse.",
    "0 ≤ r ≤ n ≤ 10^6; p is prime ≤ 10^9+7",
    "10 3 1000000007","120",
    [["10 3 1000000007","120"],["1000000 500000 1000000007","149033233"]]),

  // ---- ADVANCED DATA STRUCTURES ----
  P("Trie Insert and Search","Elite",["trie","design"],
    "Implement a Trie with `insert word`, `search word` (exact match → `Yes`/`No`), and `prefix word` (prefix exists → `Yes`/`No`). Process `Q` operations.",
    "1 ≤ Q ≤ 10^5; 1 ≤ |word| ≤ 200",
    "7\ninsert apple\nsearch apple\nsearch app\nprefix app\ninsert app\nsearch app\nprefix ap","Yes\nNo\nYes\nYes\nYes",
    [["7\ninsert apple\nsearch apple\nsearch app\nprefix app\ninsert app\nsearch app\nprefix ap","Yes\nNo\nYes\nYes\nYes"]]),

  P("Disjoint Set Union (DSU)","Elite",["union-find","design"],
    "Implement Union-Find with path compression and union by rank. Given `N` elements and `Q` operations (`union a b` or `find a b` — same set?), process them. Print each `find` result.",
    "1 ≤ N, Q ≤ 10^5",
    "5 6\nunion 1 2\nunion 3 4\nfind 1 3\nunion 2 3\nfind 1 4\nfind 2 3","No\nYes\nYes",
    [["5 6\nunion 1 2\nunion 3 4\nfind 1 3\nunion 2 3\nfind 1 4\nfind 2 3","No\nYes\nYes"]]),

  P("Segment Tree Range Sum","Elite",["segment-tree","design"],
    "Build a segment tree for `N` integers supporting: `update i val` (set a[i]=val) and `query l r` (sum from l to r, 0-based). Print each query result.",
    "1 ≤ N, Q ≤ 10^5; |val| ≤ 10^9",
    "5\n1 3 5 7 9\n4\nquery 1 3\nupdate 2 6\nquery 1 3\nquery 0 4","15\n16\n26",
    [["5\n1 3 5 7 9\n4\nquery 1 3\nupdate 2 6\nquery 1 3\nquery 0 4","15\n16\n26"]]),

  P("Binary Indexed Tree (BIT)","Elite",["bit","design"],
    "Using a Fenwick Tree, support `update i delta` (add delta to a[i]) and `query l r` (prefix sum from l to r, 1-based). Print each query.",
    "1 ≤ N, Q ≤ 10^5; |delta| ≤ 10^9",
    "5\n1 3 5 7 9\n3\nquery 1 3\nupdate 2 3\nquery 1 3","9\n12",
    [["5\n1 3 5 7 9\n3\nquery 1 3\nupdate 2 3\nquery 1 3","9\n12"]]),

  P("Merge Sort Tree","Elite",["segment-tree","sorting"],
    "Given `N` integers and `Q` queries `l r k`, count elements in range [l, r] (0-based) that are ≤ k.",
    "1 ≤ N, Q ≤ 10^5; |a_i|, |k| ≤ 10^9",
    "5\n1 5 2 6 3\n3\n0 2 3\n1 4 5\n0 4 4","2\n3\n3",
    [["5\n1 5 2 6 3\n3\n0 2 3\n1 4 5\n0 4 4","2\n3\n3"]]),

  // ---- GAME THEORY ----
  P("Nim Game","Elite",["math","game-theory"],
    "Given `N` piles with stones, two players take turns removing any number from one pile. The player who takes the last stone wins. Print `First` or `Second` for the winner.",
    "1 ≤ N ≤ 100; 0 ≤ pile_i ≤ 10^9",
    "3\n1 2 3","First",
    [["3\n1 2 3","First"],["2\n5 5","Second"],["1\n0","Second"]]),

  P("Sprague-Grundy","Elite",["dp","game-theory"],
    "A game: two players take turns removing 1, 3, or 4 stones from a pile. Whoever takes the last stone wins. Given `N` stones, print `First` or `Second`.",
    "0 ≤ N ≤ 10^6",
    "7","First",
    [["7","First"],["0","Second"],["2","Second"],["5","First"]]),

  P("Stone Game","Elite",["dp","game-theory"],
    "Alice and Bob take turns picking stones from either end of an array. Alice goes first. Both play optimally. Print Alice's final score.",
    "1 ≤ N ≤ 500; N is even; 1 ≤ stone_i ≤ 1000",
    "4\n5 3 4 5","10",
    [["4\n5 3 4 5","10"],["2\n1 2","2"]]),

  // ---- COMPLEX GREEDY ----
  P("Meeting Rooms II","Elite",["greedy","sorting"],
    "Given `N` meeting intervals `[start, end)`, find the minimum number of conference rooms required.",
    "1 ≤ N ≤ 10^5",
    "3\n0 30\n5 10\n15 20","2",
    [["3\n0 30\n5 10\n15 20","2"],["2\n7 10\n2 4","1"]]),

  P("Minimum Number of Arrows","Elite",["greedy","sorting"],
    "Given `N` balloons as intervals `[start, end]`, find the minimum arrows (each arrow at some x bursts all balloons containing x).",
    "1 ≤ N ≤ 10^5",
    "4\n10 16\n2 8\n1 6\n7 12","2",
    [["4\n10 16\n2 8\n1 6\n7 12","2"],["2\n1 2\n3 4","2"],["3\n1 10\n2 9\n3 8","1"]]),

  P("Queue Reconstruction by Height","Elite",["greedy","sorting"],
    "People described by `(h, k)`: height h, k people in front with height ≥ h. Reconstruct the queue. Print `h k` pairs in order.",
    "1 ≤ N ≤ 2000",
    "6\n7 0\n4 4\n7 1\n5 0\n6 1\n5 2","5 0\n7 0\n5 2\n6 1\n4 4\n7 1",
    [["6\n7 0\n4 4\n7 1\n5 0\n6 1\n5 2","5 0\n7 0\n5 2\n6 1\n4 4\n7 1"]]),

  P("IPO (Maximize Capital)","Elite",["greedy","sorting"],
    "Given `N` projects with profit and capital required, initial capital `W`, and you can do at most `K` projects sequentially, maximize your final capital.",
    "1 ≤ K ≤ N ≤ 10^5; 0 ≤ W ≤ 10^9",
    "3 2 0\n1 2 3\n0 1 1","4",
    [["3 2 0\n1 2 3\n0 1 1","4"],["2 1 0\n1 1\n0 1","1"]]),

  // ---- DIVIDE AND CONQUER ----
  P("Count Inversions (Merge Sort)","Elite",["divide-and-conquer","sorting"],
    "Count the number of inversions (pairs where i < j but a[i] > a[j]) in O(N log N).",
    "1 ≤ N ≤ 10^5",
    "5\n2 4 1 3 5","3",
    [["5\n2 4 1 3 5","3"],["3\n3 2 1","3"],["3\n1 2 3","0"]]),

  P("Closest Pair of Points","Elite",["divide-and-conquer","geometry"],
    "Given `N` points in 2D, find the minimum distance between any two points. Print to 4 decimal places.",
    "2 ≤ N ≤ 10^5; |x_i|, |y_i| ≤ 10^9",
    "4\n2 3\n12 30\n40 50\n5 1","3.6056",
    [["4\n2 3\n12 30\n40 50\n5 1","3.6056"],["2\n0 0\n3 4","5.0000"]]),

  P("Maximum Subarray (Divide & Conquer)","Elite",["divide-and-conquer"],
    "Find the maximum subarray sum using divide and conquer (not Kadane's). Print the maximum sum.",
    "1 ≤ N ≤ 10^5; |a_i| ≤ 10^4",
    "8\n-2 1 -3 4 -1 2 1 -5","6",
    [["8\n-2 1 -3 4 -1 2 1 -5","6"],["1\n-1","-1"],["3\n1 2 3","6"]]),

  P("Kth Element of Two Sorted Arrays","Elite",["divide-and-conquer","binary-search"],
    "Given two sorted arrays and `K`, find the Kth smallest element in their merged form (1-based).",
    "1 ≤ K ≤ M+N ≤ 2×10^5",
    "4\n2 3 6 7\n4\n1 4 8 10\n5","6",
    [["4\n2 3 6 7\n4\n1 4 8 10\n5","6"],["3\n1 3 5\n2\n2 4\n4","4"]]),

  // ---- MORE ELITE ----
  P("Maximal Rectangle in Binary Matrix","Elite",["stack","dp","matrix"],
    "Given an `M×N` binary matrix, find the area of the largest rectangle containing only 1s.",
    "1 ≤ M, N ≤ 200",
    "4 5\n1 0 1 0 0\n1 0 1 1 1\n1 1 1 1 1\n1 0 0 1 0","6",
    [["4 5\n1 0 1 0 0\n1 0 1 1 1\n1 1 1 1 1\n1 0 0 1 0","6"],["1 1\n0","0"]]),

  P("Skyline Problem","Elite",["sorting","heap","divide-and-conquer"],
    "Given `N` buildings as `[left, right, height]`, compute the skyline contour. Print key points as `x height` pairs.",
    "1 ≤ N ≤ 10^4",
    "3\n2 9 10\n3 7 15\n5 12 12","2 10\n3 15\n7 12\n12 0",
    [["3\n2 9 10\n3 7 15\n5 12 12","2 10\n3 15\n7 12\n12 0"]]),

  P("Sliding Window Maximum","Elite",["deque","sliding-window"],
    "Given `N` integers and window size `K`, print the maximum in each window of size K as you slide from left to right.",
    "1 ≤ K ≤ N ≤ 10^5",
    "8 3\n1 3 -1 -3 5 3 6 7","3 3 5 5 6 7",
    [["8 3\n1 3 -1 -3 5 3 6 7","3 3 5 5 6 7"],["5 1\n1 2 3 4 5","1 2 3 4 5"]]),

  P("Median from Data Stream","Elite",["heap","design"],
    "Process `N` operations: `add x` adds x, `median` prints the current median (if even count, average of middle two, to 1 decimal place).",
    "1 ≤ N ≤ 10^5",
    "6\nadd 1\nadd 2\nmedian\nadd 3\nmedian\nadd 4\nmedian","1.5\n2.0\n2.5",
    [["6\nadd 1\nadd 2\nmedian\nadd 3\nmedian\nadd 4\nmedian","1.5\n2.0\n2.5"]]),

  P("Longest Increasing Path in Matrix","Elite",["dp","dfs","matrix"],
    "Given an `M×N` integer matrix, find the length of the longest increasing path (4-directional, each next cell must be strictly greater).",
    "1 ≤ M, N ≤ 200",
    "3 3\n9 9 4\n6 6 8\n2 1 1","4",
    [["3 3\n9 9 4\n6 6 8\n2 1 1","4"],["3 3\n3 4 5\n3 2 6\n2 2 1","4"]]),

  P("Trapping Rain Water 2D","Elite",["heap","bfs","matrix"],
    "Given an `M×N` elevation map, compute how much water can be trapped after raining (3D version of trapping rain water).",
    "1 ≤ M, N ≤ 110",
    "3 6\n1 4 3 1 3 2\n3 2 1 3 2 4\n2 3 3 2 3 1","4",
    [["3 6\n1 4 3 1 3 2\n3 2 1 3 2 4\n2 3 3 2 3 1","4"]]),

  P("Range Sum Query 2D","Elite",["dp","matrix"],
    "Given an `M×N` matrix and `Q` queries `(r1,c1,r2,c2)`, print the sum of elements in the sub-rectangle. Use 2D prefix sums.",
    "1 ≤ M, N ≤ 300; 1 ≤ Q ≤ 10^5",
    "3 3\n1 2 3\n4 5 6\n7 8 9\n2\n0 0 1 1\n0 0 2 2","12\n45",
    [["3 3\n1 2 3\n4 5 6\n7 8 9\n2\n0 0 1 1\n0 0 2 2","12\n45"]]),

  P("Minimum Spanning Arborescence","Elite",["graphs"],
    "Given a weighted directed graph with `N` nodes, `M` edges, and root `R`, find the minimum cost arborescence (directed MST rooted at R). Print the total weight or `IMPOSSIBLE`.",
    "1 ≤ N ≤ 100; 0 ≤ M ≤ 10000",
    "4 5 1\n1 2 1\n1 3 4\n2 3 2\n3 4 3\n2 4 5","6",
    [["4 5 1\n1 2 1\n1 3 4\n2 3 2\n3 4 3\n2 4 5","6"]]),

  P("Maximum Flow (Ford-Fulkerson)","Elite",["graphs"],
    "Given a flow network with `N` nodes, `M` directed edges with capacities, source `S` and sink `T`, find the maximum flow.",
    "2 ≤ N ≤ 100; 0 ≤ M ≤ 5000",
    "6 10 1 6\n1 2 16\n1 3 13\n2 3 10\n2 4 12\n3 2 4\n3 5 14\n4 3 9\n4 6 20\n5 4 7\n5 6 4","23",
    [["6 10 1 6\n1 2 16\n1 3 13\n2 3 10\n2 4 12\n3 2 4\n3 5 14\n4 3 9\n4 6 20\n5 4 7\n5 6 4","23"]]),

  P("Heavy-Light Decomposition Query","Elite",["trees","segment-tree"],
    "Given a tree with `N` weighted nodes and `Q` queries of type `path u v` (sum of values on path from u to v), implement HLD to answer in O(log²N).",
    "1 ≤ N, Q ≤ 10^5",
    "5\n1 2 3 4 5\n4\n1 2\n2 3\n1 4\n4 5\n2\npath 3 5\npath 1 3","15\n6",
    [["5\n1 2 3 4 5\n4\n1 2\n2 3\n1 4\n4 5\n2\npath 3 5\npath 1 3","15\n6"]]),

  P("LCA with Binary Lifting","Elite",["trees","dp"],
    "Given a rooted tree with `N` nodes and `Q` queries, find the Lowest Common Ancestor of two nodes using binary lifting in O(log N) per query.",
    "1 ≤ N, Q ≤ 10^5",
    "7\n0 1 1 2 2 3 3\n3\n4 5\n4 6\n5 6","2\n1\n1",
    [["7\n0 1 1 2 2 3 3\n3\n4 5\n4 6\n5 6","2\n1\n1"]]),

  P("Centroid Decomposition","Elite",["trees","divide-and-conquer"],
    "Given a tree with `N` nodes and `Q` queries asking for the number of paths of length exactly `K`, build a centroid decomposition.",
    "1 ≤ N ≤ 10^5; 1 ≤ Q ≤ 10",
    "5\n1 2\n1 3\n2 4\n2 5\n2\n1\n2","4\n3",
    [["5\n1 2\n1 3\n2 4\n2 5\n2\n1\n2","4\n3"]]),

  P("Suffix Array Construction","Elite",["strings","algorithms"],
    "Given string `S`, construct its suffix array (array of starting indices of all sorted suffixes). Print the array.",
    "1 ≤ |S| ≤ 10^5",
    "banana","5 3 1 0 4 2",
    [["banana","5 3 1 0 4 2"],["abc","0 1 2"]]),

  P("Maximum XOR of Two Numbers","Elite",["bit-manipulation","trie"],
    "Given `N` integers, find the maximum XOR of any two elements.",
    "2 ≤ N ≤ 2×10^4; 0 ≤ a_i ≤ 2^31",
    "6\n3 10 5 25 2 8","28",
    [["6\n3 10 5 25 2 8","28"],["2\n1 2","3"]]),

  P("Count of Smaller Numbers After Self","Elite",["segment-tree","merge-sort"],
    "Given `N` integers, for each element count how many elements to its right are strictly smaller. Print the counts.",
    "1 ≤ N ≤ 10^5; |a_i| ≤ 10^4",
    "4\n5 2 6 1","2 1 1 0",
    [["4\n5 2 6 1","2 1 1 0"],["3\n1 2 3","0 0 0"],["3\n3 2 1","2 1 0"]]),

  P("Minimum Window Containing All Characters","Elite",["sliding-window","hashing"],
    "Given string `S` and string `T`, find the minimum window in `S` that contains all characters of `T` (including duplicates). Print the window length or `0`.",
    "1 ≤ |S| ≤ 10^5; 1 ≤ |T| ≤ |S|",
    "ADOBECODEBANC\nABC","4",
    [["ADOBECODEBANC\nABC","4"],["a\nb","0"]]),

  P("Travelling Salesman (Bitmask DP)","Elite",["dp","bit-manipulation","graphs"],
    "Given `N` cities and a distance matrix, find the minimum cost to visit all cities exactly once and return to the starting city.",
    "2 ≤ N ≤ 20; 0 ≤ dist ≤ 10^6",
    "4\n0 10 15 20\n10 0 35 25\n15 35 0 30\n20 25 30 0","80",
    [["4\n0 10 15 20\n10 0 35 25\n15 35 0 30\n20 25 30 0","80"]]),

  P("Convex Hull","Elite",["geometry","sorting"],
    "Given `N` points in 2D, find the convex hull. Print the vertices in counter-clockwise order starting from the leftmost-lowest point.",
    "3 ≤ N ≤ 10^5",
    "8\n0 3\n1 1\n2 2\n4 4\n0 0\n1 2\n3 1\n3 3","0 0\n3 1\n4 4\n0 3",
    [["8\n0 3\n1 1\n2 2\n4 4\n0 0\n1 2\n3 1\n3 3","0 0\n3 1\n4 4\n0 3"]]),

  P("Number of Distinct Subsequences","Elite",["dp","strings"],
    "Given string `S`, count the number of distinct subsequences modulo 10^9+7.",
    "1 ≤ |S| ≤ 10^5",
    "abc","7",
    [["abc","7"],["aaa","3"],["abab","12"]]),

  P("Edit Distance with Operations","Elite",["dp","strings"],
    "Given two strings, find the minimum edit distance AND print the sequence of operations (I=insert, D=delete, R=replace, M=match), one per line.",
    "0 ≤ |A|, |B| ≤ 500",
    "kitten\nsitting","3",
    [["kitten\nsitting","3"]]),

  P("Minimum Cost Flow","Elite",["graphs"],
    "Given a flow network with costs, find the minimum cost to send `F` units of flow from source to sink.",
    "2 ≤ N ≤ 100; 0 ≤ M ≤ 5000",
    "4 5 1 4 2\n1 2 1 3\n1 3 2 1\n2 3 1 1\n2 4 2 1\n3 4 1 3","4",
    [["4 5 1 4 2\n1 2 1 3\n1 3 2 1\n2 3 1 1\n2 4 2 1\n3 4 1 3","4"]]),

  P("Persistent Segment Tree","Elite",["segment-tree","design"],
    "Given `N` integers and `Q` operations: `update ver i val` (create new version with a[i]=val based on version ver), `query ver l r` (sum in version ver from l to r). Print each query result.",
    "1 ≤ N, Q ≤ 10^5",
    "5\n1 2 3 4 5\n4\nquery 0 0 4\nupdate 0 2 10\nquery 1 0 4\nquery 0 0 4","15\n22\n15",
    [["5\n1 2 3 4 5\n4\nquery 0 0 4\nupdate 0 2 10\nquery 1 0 4\nquery 0 0 4","15\n22\n15"]]),

  P("String Hashing with Double Hash","Elite",["strings","hashing"],
    "Given `N` strings, count the number of distinct strings using double polynomial hashing.",
    "1 ≤ N ≤ 10^5; 1 ≤ |S_i| ≤ 100",
    "5\nabc\ndef\nabc\nghi\ndef","3",
    [["5\nabc\ndef\nabc\nghi\ndef","3"],["3\na\na\na","1"]]),

  P("Palindromic Tree","Elite",["strings","design"],
    "Given string `S`, build an Eertree (palindromic tree) and count the number of distinct palindromic substrings.",
    "1 ≤ |S| ≤ 10^5",
    "abcbab","6",
    [["abcbab","6"],["aaa","3"],["abacaba","7"]]),

  P("Aho-Corasick Multi-Pattern Search","Elite",["strings","trie","algorithms"],
    "Given `N` pattern strings and a text `T`, find the total number of pattern occurrences in `T` (including overlapping matches of different patterns).",
    "1 ≤ N ≤ 500; 1 ≤ |T| ≤ 10^6; sum of |patterns| ≤ 10^5",
    "3\nhe she his\nahishers","4",
    [["3\nhe she his\nahishers","4"]]),

  P("Mo's Algorithm Range Queries","Elite",["arrays","sqrt-decomposition"],
    "Given `N` integers and `Q` queries `[L, R]` (0-based), count distinct elements in range. Use Mo's algorithm for offline batch queries.",
    "1 ≤ N, Q ≤ 10^5; 1 ≤ a_i ≤ 10^6",
    "5\n1 1 2 1 3\n3\n0 4\n1 3\n2 4","3\n2\n3",
    [["5\n1 1 2 1 3\n3\n0 4\n1 3\n2 4","3\n2\n3"]]),

  P("Digit DP — Count of Numbers with Given Property","Elite",["dp","math"],
    "Count integers in range `[L, R]` whose digit sum is divisible by `K`.",
    "1 ≤ L ≤ R ≤ 10^18; 1 ≤ K ≤ 100",
    "1 100 5","20",
    [["1 100 5","20"],["10 15 3","2"]]),

  P("XOR Basis (Linear Algebra over GF2)","Elite",["bit-manipulation","math"],
    "Given `N` integers, find the size of the XOR basis (maximum number of linearly independent values over GF(2)).",
    "1 ≤ N ≤ 10^5; 0 ≤ a_i ≤ 10^18",
    "5\n1 2 3 4 5","3",
    [["5\n1 2 3 4 5","3"],["3\n7 7 7","1"],["4\n1 2 4 8","4"]]),

  P("Matrix Exponentiation Fibonacci","Elite",["math","matrix","dp"],
    "Given `N`, compute the Nth Fibonacci number modulo 10^9+7 using matrix exponentiation in O(log N).",
    "0 ≤ N ≤ 10^18",
    "1000000000000000000","209783453",
    [["1000000000000000000","209783453"],["10","55"],["0","0"]]),

  P("Minimum Vertex Cover on Tree","Elite",["trees","dp"],
    "Given a tree with `N` nodes, find the minimum vertex cover (smallest set of vertices such that every edge has at least one endpoint in the set). Print the count.",
    "1 ≤ N ≤ 10^5",
    "5\n1 2\n1 3\n2 4\n2 5","2",
    [["5\n1 2\n1 3\n2 4\n2 5","2"],["3\n1 2\n2 3","1"]]),

  P("Euler Path/Circuit","Elite",["graphs"],
    "Given an undirected graph with `N` nodes and `M` edges, determine if an Euler circuit (all edges, return to start) exists. Print `Circuit`, `Path`, or `Neither`.",
    "1 ≤ N ≤ 10^5; 0 ≤ M ≤ 2×10^5",
    "5 6\n1 2\n2 3\n3 4\n4 5\n5 1\n1 3","Path",
    [["5 6\n1 2\n2 3\n3 4\n4 5\n5 1\n1 3","Path"],["3 3\n1 2\n2 3\n3 1","Circuit"]]),

  P("2-SAT","Elite",["graphs","dfs"],
    "Given `N` boolean variables and `M` clauses (each clause is a disjunction of two literals), determine if the formula is satisfiable. Print `Yes` or `No`.",
    "1 ≤ N ≤ 10^5; 1 ≤ M ≤ 2×10^5",
    "3 3\n1 -2\n-1 3\n2 -3","Yes",
    [["3 3\n1 -2\n-1 3\n2 -3","Yes"],["1 2\n1 -1\n-1 1","No"]]),

  P("Bipartite Maximum Matching","Elite",["graphs"],
    "Given a bipartite graph with `N` left nodes, `M` right nodes, and `E` edges, find the maximum matching using Hopcroft-Karp. Print the count.",
    "1 ≤ N, M ≤ 500; 0 ≤ E ≤ N×M",
    "3 3 4\n1 1\n1 2\n2 2\n3 3","3",
    [["3 3 4\n1 1\n1 2\n2 2\n3 3","3"],["2 2 2\n1 1\n2 1","1"]]),

  P("Tree DP — Maximum Independent Set","Elite",["trees","dp"],
    "Given a tree with `N` nodes, each with a weight, find the maximum weight independent set (no two adjacent nodes selected).",
    "1 ≤ N ≤ 10^5; 1 ≤ weight_i ≤ 10^4",
    "5\n10 20 30 40 50\n1 2\n1 3\n2 4\n2 5","100",
    [["5\n10 20 30 40 50\n1 2\n1 3\n2 4\n2 5","100"]]),

  P("Polygon Area","Elite",["geometry","math"],
    "Given `N` vertices of a simple polygon in order, compute its area using the Shoelace formula. Print to 1 decimal place.",
    "3 ≤ N ≤ 10^5; |x_i|, |y_i| ≤ 10^6",
    "4\n0 0\n4 0\n4 3\n0 3","12.0",
    [["4\n0 0\n4 0\n4 3\n0 3","12.0"],["3\n0 0\n1 0\n0 1","0.5"]]),

  P("Longest Common Substring","Elite",["dp","strings","binary-search"],
    "Given two strings, find the length of their longest common substring (contiguous).",
    "1 ≤ |A|, |B| ≤ 5000",
    "abcdef\nzbcdf","3",
    [["abcdef\nzbcdf","3"],["abc\nxyz","0"],["abcabc\nabc","3"]]),

  P("Count Subarrays with XOR K","Elite",["arrays","hashing","bit-manipulation"],
    "Given `N` integers and `K`, count contiguous subarrays with XOR equal to `K`.",
    "1 ≤ N ≤ 10^5; 0 ≤ a_i, K ≤ 10^6",
    "5 6\n4 2 2 6 4","4",
    [["5 6\n4 2 2 6 4","4"],["3 0\n0 0 0","6"]]),

  P("Maximum Sum Rectangle","Elite",["dp","arrays"],
    "Given an `M×N` matrix, find the sub-rectangle with the maximum sum. Print that sum.",
    "1 ≤ M, N ≤ 100; |a_ij| ≤ 10000",
    "4 5\n1 2 -1 -4 -20\n-8 -3 4 2 1\n3 8 10 1 3\n-4 -1 1 7 -6","29",
    [["4 5\n1 2 -1 -4 -20\n-8 -3 4 2 1\n3 8 10 1 3\n-4 -1 1 7 -6","29"]]),

  P("Count Palindromic Substrings","Elite",["dp","strings"],
    "Given string `S`, count the total number of palindromic substrings (including single characters).",
    "1 ≤ |S| ≤ 1000",
    "aaa","6",
    [["aaa","6"],["abc","3"],["abba","6"]]),

  P("Minimum Operations to Make Array Equal","Elite",["math","greedy"],
    "Given `N` integers, find the minimum number of increment/decrement operations to make all elements equal. Each operation changes one element by 1.",
    "1 ≤ N ≤ 10^5; |a_i| ≤ 10^9",
    "4\n1 2 3 4","4",
    [["4\n1 2 3 4","4"],["3\n1 1 1","0"],["5\n1 10 2 9 3","16"]]),
];

// ========================================================================
//  SEEDER
// ========================================================================
async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to: ${MONGO_URI}`);

  // Check how many daily forge challenges already exist
  const existingCount = await Challenge.countDocuments({ tags: 'daily-forge' });
  if (existingCount >= 1000) {
    console.log(`Already ${existingCount} daily-forge challenges. Skipping.`);
    process.exit(0);
  }

  // Delete existing daily-forge challenges to re-seed
  if (existingCount > 0) {
    await Challenge.deleteMany({ tags: 'daily-forge' });
    console.log(`Cleared ${existingCount} existing daily-forge challenges.`);
  }

  // Build the daily schedule
  const allProblems = [];
  let ri = 0, oi = 0, ei = 0;

  for (let day = 1; day <= 365; day++) {
    const diffs = getDayDifficulties(day);
    const date = new Date(START_DATE.getTime() + (day - 1) * 86400000);

    for (const diff of diffs) {
      let problem;
      if (diff === 'Rookie') {
        problem = ROOKIE[ri % ROOKIE.length];
        ri++;
      } else if (diff === 'Operative') {
        problem = OPERATIVE[oi % OPERATIVE.length];
        oi++;
      } else {
        problem = ELITE[ei % ELITE.length];
        ei++;
      }

      allProblems.push({
        ...problem,
        tags: [...(problem.tags || []), 'daily-forge', `day-${day}`],
        activeFrom: date
      });
    }
  }

  console.log(`Inserting ${allProblems.length} challenges...`);

  // Batch insert in chunks of 100
  for (let i = 0; i < allProblems.length; i += 100) {
    const batch = allProblems.slice(i, i + 100);
    await Challenge.insertMany(batch);
    process.stdout.write(`  ${Math.min(i + 100, allProblems.length)}/${allProblems.length}\r`);
  }

  console.log(`\nDone! Seeded ${allProblems.length} daily challenges.`);
  console.log(`  Rookie pool: ${ROOKIE.length} unique problems`);
  console.log(`  Operative pool: ${OPERATIVE.length} unique problems`);
  console.log(`  Elite pool: ${ELITE.length} unique problems`);
  console.log(`  Date range: ${START_DATE.toISOString().split('T')[0]} to ${new Date(START_DATE.getTime() + 364*86400000).toISOString().split('T')[0]}`);

  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
