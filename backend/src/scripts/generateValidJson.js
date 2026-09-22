import fs from 'fs';
import path from 'path';

const questions = [];

// Fisher-Yates Shuffle Algorithm
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const generateMasterPack = () => {
    const domains = [
        {
            round: 1,
            theme: "OSINT/Recon",
            data: [
                ["Subdomain Discovery Tool", "Sublist3r", ["Sublist3r", "Wireshark", "Hashcat", "GDB"]],
                ["WHOIS Query Target", "Domain Registry", ["Domain Registry", "Port Scan", "Packet Trace", "Memory Dump"]],
                ["Google Dorking Operator", "intitle:", ["intitle:", "grep", "ping", "cd"]],
                ["Professional Intel Platform", "LinkedIn", ["LinkedIn", "Instagram", "TikTok", "Reddit"]],
                ["IoT Search Engine", "Shodan", ["Shodan", "Google", "Bing", "DuckDuckGo"]],
                ["Robots.txt Intent", "Hide from Crawlers", ["Hide from Crawlers", "Speed up Loading", "Encrypt IP", "Backup Site"]],
                ["Metadata Scraper", "ExifTool", ["ExifTool", "Nmap", "Metasploit", "Aircrack"]],
                ["Historical Web Archive", "Wayback Machine", ["Wayback Machine", "Shodan", "Crt.sh", "TinEye"]],
                ["Site Downloader", "wget", ["wget", "curl", "ping", "ssh"]],
                ["Passive Recon Method", "Public Records", ["Public Records", "Active Scanning", "Brute Force", "Infiltration"]]
            ]
        },
        {
            round: 2,
            theme: "Cryptography",
            data: [
                ["ROT13 Shift Value", "13", ["13", "1", "26", "0"]],
                ["Asymmetric Key Pair", "Public/Private", ["Public/Private", "Single Key", "No Key", "Shared Key"]],
                ["MD5 Vulnerability", "Collision", ["Collision", "Inhuman Speed", "Entropy", "Logic Error"]],
                ["Rainbow Table Use", "Crack Hashes", ["Crack Hashes", "Generate SSL", "Map Network", "Sniff Traffic"]],
                ["AES ECB Mode", "Electronic Codebook", ["Electronic Codebook", "Cipher Block", "Extended Buffer", "Secure Core"]],
                ["SHA-256 Length", "256 bits", ["256 bits", "128 bits", "512 bits", "64 bits"]],
                ["Playfair Matrix Size", "5x5", ["5x5", "6x6", "4x4", "8x8"]],
                ["XOR Identity Result", "0", ["0", "1", "A", "FF"]],
                ["Classical Cipher Type", "Caesar", ["Caesar", "AES", "RSA", "ECC"]],
                ["OTP Requirement", "Never Reuse Key", ["Never Reuse Key", "Strong Password", "High Speed", "Salted Hash"]]
            ]
        },
        {
            round: 3,
            theme: "Web Exploit",
            data: [
                ["XSS Execution Site", "Browser", ["Browser", "Server", "Database", "Firewall"]],
                ["SQLi Main Target", "Database", ["Database", "CPU", "RAM", "Network"]],
                ["SSRF Induction", "Server-Side", ["Server-Side", "Client-Side", "User-Agent", "Referer"]],
                ["HTTP 410 Meaning", "Gone", ["Gone", "Not Found", "Forbidden", "Error"]],
                ["LFI Primary Goal", "Read Local Files", ["Read Local Files", "Delete Database", "Change Port", "Stop Service"]],
                ["JWT Segment Count", "Three", ["Three", "Two", "Four", "One"]],
                ["SOP Security Focus", "Origin Isolation", ["Origin Isolation", "Speed", "Storage", "Caching"]],
                ["CSRF Defense Tool", "Anti-Forgery Token", ["Anti-Forgery Token", "Encryption", "Password", "CAPTCHA"]],
                ["Web Proxy Platform", "Burp Suite", ["Burp Suite", "Nmap", "Wireshark", "Hashcat"]],
                ["OWASP Top 10 Entry", "A01:2021", ["A01:2021", "B02:2022", "C03:2023", "D04:2024"]]
            ]
        },
        {
            round: 4,
            theme: "Forensics",
            data: [
                ["Memory Analysis Tool", "Volatility", ["Volatility", "Nmap", "Burp Suite", "Hashcat"]],
                ["File Signature Type", "Magic Bytes", ["Magic Bytes", "Extension", "Size", "Date"]],
                ["Network Forensics", "Wireshark", ["Wireshark", "GDB", "Ghidra", "John"]],
                ["Unallocated Recovery", "Carving", ["Carving", "Encryption", "Deletion", "Hashing"]],
                ["Windows Artifact", "Prefetch", ["Prefetch", "Bash History", "Kernel Log", "BIOS"]],
                ["Image Analysis", "StegSolve", ["StegSolve", "Nmap", "Burp", "Metasploit"]],
                ["Forensic Image Type", "E01", ["E01", "ISO", "ZIP", "EXE"]],
                ["Timestamp Analysis", "MAC Times", ["MAC Times", "UTC", "PST", "GMT"]],
                ["Evidence Integrity", "Hashing", ["Hashing", "Encryption", "Copying", "Deleting"]],
                ["Live RAM Analysis", "RAM Capture", ["RAM Capture", "Disk Clone", "Registry Edit", "Port Scan"]]
            ]
        },
        {
            round: 5,
            theme: "Binary/PWN",
            data: [
                ["Instruction Pointer", "RIP", ["RIP", "RAX", "RSP", "RBP"]],
                ["Stack Protection", "Canary", ["Canary", "NX", "ASLR", "PIE"]],
                ["Memory Corruption", "Buffer Overflow", ["Buffer Overflow", "Logic Error", "UAF", "Race Condition"]],
                ["NX Mitigation Type", "No-Execute", ["No-Execute", "Randomization", "Encryption", "Hashing"]],
                ["Exploit Technique", "ROP Chain", ["ROP Chain", "SQLi", "XSS", "LFI"]],
                ["Primary Debugger", "GDB", ["GDB", "Nmap", "Burp", "Wireshark"]],
                ["RE Analysis Platform", "Ghidra", ["Ghidra", "VS Code", "Notepad", "Chrome"]],
                ["Function Return Reg", "RAX", ["RAX", "RBX", "RCX", "RDX"]],
                ["Next Instruction Reg", "EIP", ["EIP", "ESP", "EBP", "EAX"]],
                ["Advanced Mitigation", "ASLR", ["ASLR", "DEP", "NX", "SafeSEH"]]
            ]
        }
    ];

    domains.forEach(domain => {
        for (let i = 0; i < 50; i++) {
            const entry = domain.data[i % domain.data.length];
            const originalCorrectAnswer = entry[1];
            // Clone and Shuffle the options
            const shuffledOptions = shuffleArray([...entry[2]]);
            // Find the new index of the correct answer
            const correctIndex = shuffledOptions.indexOf(originalCorrectAnswer);

            questions.push({
                questionText: `${domain.theme} Challenge #${i + 1}: ${entry[0]}?`,
                options: shuffledOptions,
                correctOption: correctIndex, // Dynamically calculated
                explanation: `Tactical verification of the ${originalCorrectAnswer} vector.`,
                points: 10 + (Math.floor(i / 10) * 5),
                roundNumber: domain.round
            });
        }
    });

    const targetPath = path.join(process.cwd(), 'artifacts/ctf_master_payload.json');
    fs.writeFileSync(targetPath, JSON.stringify(questions, null, 2));
    console.log(`Success: Generated 250 SHUFFLED questions to ${targetPath}`);
};

generateMasterPack();
