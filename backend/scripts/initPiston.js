import fetch from 'node-fetch';

const PISTON_URL = process.env.PISTON_URL || 'http://localhost:2000';

const REQUIRED_PACKAGES = [
    { language: 'python', version: '*' },
    { language: 'node', version: '*' },
    { language: 'gcc', version: '*' }
];

async function initPiston() {
    console.log(`Checking Piston Execution Engine at ${PISTON_URL}...`);

    try {
        // 1. Fetch currently installed packages
        const response = await fetch(`${PISTON_URL}/api/v2/packages`);
        if (!response.ok) throw new Error('Failed to reach Piston API');
        
        const installedPackages = await response.json();
        const installedNames = installedPackages.map(pkg => pkg.language);

        // 2. Determine what's missing
        const missingPackages = REQUIRED_PACKAGES.filter(
            req => !installedNames.includes(req.language)
        );

        if (missingPackages.length === 0) {
            console.log('✅ All required compilers (Python, Node, GCC) are already installed.');
            return;
        }

        // 3. Install missing packages
        for (const pkg of missingPackages) {
            console.log(`⏳ Installing ${pkg.language} compiler... (This may take a minute)`);
            const installRes = await fetch(`${PISTON_URL}/api/v2/packages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pkg)
            });

            if (installRes.ok) {
                console.log(`✅ Successfully installed ${pkg.language}!`);
            } else {
                console.error(`❌ Failed to install ${pkg.language}. Status: ${installRes.status}`);
            }
        }

        console.log('🎉 Piston setup complete!');

    } catch (error) {
        console.error('❌ Could not connect to Piston. Is the Docker container running?', error.message);
    }
}

initPiston();
