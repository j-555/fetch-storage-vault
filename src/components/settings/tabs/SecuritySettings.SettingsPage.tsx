import { useState, useEffect } from 'react';

function SecuritySettings() {
    const [userId11, setUserId11] = useState('Loading...');

    // Function to generate master key UID
    const getMasterKeyUid = async () => {
        // Placeholder values - these should come from your actual vault data
        const masterKey = 'placeholder-master-key';
        const vaultId = 'placeholder-vault-id';
        const machineData = 'placeholder-machine-data';

        // Security: Generate salt per vault using secure methods
        let vaultSalt: string = localStorage.getItem('vaultSalt') || '';
        if (!vaultSalt) {
            try {
                // Use cryptographically secure random generation
                const randomBytes = new Uint8Array(32); // Increased to 32 bytes for better security
                if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                    vaultSalt = crypto.randomUUID();
                } else if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
                    crypto.getRandomValues(randomBytes);
                    vaultSalt = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
                } else {
                    // Fallback: generate random string using available entropy
                    for (let i = 0; i < 16; i++) {
                        randomBytes[i] = Math.floor(Math.random() * 256);
                    }
                    vaultSalt = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
                }
                localStorage.setItem('vaultSalt', vaultSalt); // Store in local storage
            } catch (error) {
                console.error('Failed to generate vault salt:', error);
                // Security: More secure fallback using timestamp and crypto if available
                const timestamp = Date.now().toString(36);
                const randomPart = crypto.randomUUID?.() || Math.random().toString(36);
                vaultSalt = 'fallback-' + timestamp + '-' + randomPart;
                localStorage.setItem('vaultSalt', vaultSalt);
            }
        }

        // Combine master key + vault ID + salt + machine data for maximum uniqueness
        const combinedData = masterKey + '|' + vaultId + '|' + vaultSalt + '|' + machineData;

        // Use native browser crypto for hashing
        const encoder = new TextEncoder();
        const data = encoder.encode(combinedData);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Use 16 digits instead of 11 for even lower collision probability
        const uid = hash.replace(/\D/g, '').slice(0, 16);

        // Security: Store UID in session storage only (not persistent)
        sessionStorage.setItem('userId11_' + hash, uid);
        return uid;
    };

    useEffect(() => {
        async function updateUid() {
            const uid = await getMasterKeyUid();
            setUserId11(uid);
        }

        updateUid();
    }, []);

    return (
        <div>
            <h2>Security Settings</h2>
            <p>User ID: {userId11}</p>
            {/* Render your component content here */}
        </div>
    );
}

export default SecuritySettings;