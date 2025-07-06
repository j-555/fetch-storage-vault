# Fetch Storage Vault 🗄️

> **Warning**: This project was built by two coders who are completely winging it and have absolutely no idea what they're doing. Proceed at your own risk.

## What is this monstrosity?

A secure vault application built with Tauri and React that lets you store all your sensitive stuff (passwords, files, secrets, your ex's phone number, etc.) in one place. Because apparently having 47 different password managers wasn't enough.

## Features (that we somehow managed to implement)

- 🔐 **Secure Storage**: Your data is encrypted (we think)
- 🎨 **Dark/Light Mode**: Because we can't decide on a theme
- 📁 **File Management**: Upload, organize, and probably lose your files
- 🔍 **Search**: Find stuff you forgot you had
- 🏷️ **Tagging**: Organize your chaos with tags
- 📊 **Statistics**: See how much time you've wasted organizing your digital life
- 🔄 **Import/Export**: Because you'll probably want to switch to a real password manager eventually

## Installation (if you're brave enough)

```bash
# Clone this repository (if you dare)
git clone https://github.com/j-555/fetch-storage-vault.git

# Navigate to the project directory
cd fetch-storage-vault

# Install dependencies (pray it works)
npm install

# Run the development server
npm run tauri dev
```

## Building (good luck with that)

```bash
# Build the application (cross your fingers)
npm run tauri build
```

## The Story Behind This Mess

- **Day 1**: "This will be easy, we'll have it done by Friday"
- **Day 3**: "Why is nothing working?"
- **Day 7**: "Let's just add more features, that'll fix the bugs"
- **Day 14**: "We should probably add some security features"
- **Day 21**: "What even is this code anymore?"
- **Day 30**: "Good enough, ship it!"

## Security Disclaimer

⚠️ **IMPORTANT**: This application was built by people who learned React from YouTube tutorials and think "encryption" is just a fancy word for "password protection." 

- We're not security experts
- We probably made mistakes
- Use at your own risk
- Don't store your nuclear launch codes here
- Seriously, don't blame us if your data gets stolen

## Contributing

Want to help make this less terrible? Great! We need all the help we can get.

1. Fork the repository
2. Create a feature branch (or just wing it like we did)
3. Make your changes
4. Submit a pull request
5. Hope for the best

## Known Issues

- Everything
- The code is a mess
- We don't know how to fix most bugs
- The UI is inconsistent
- Performance is questionable
- Security is probably compromised

## Roadmap (if we don't give up)

- [ ] Fix all the bugs we created
- [ ] Add proper error handling (lol)
- [ ] Improve security (whatever that means)
- [ ] Make the UI less terrible
- [ ] Add tests (we heard those are important)
- [ ] Documentation (this counts, right?)

## License

MIT License - Do whatever you want with this mess, we don't care anymore.

## Support

Need help? Good luck with that. We barely know how this thing works ourselves.

- Create an issue (we might look at it)
- Send us a message (we might respond)
- Pray to the coding gods (probably your best bet)

---

## Actual Security Disclaimer

### Core Security Architecture

**🔐 Encryption & Key Management:**
- **Master Passwords** are hashed using Argon2id, a modern and secure key derivation function with configurable memory, time, and parallelism parameters
- **AES-256-GCM** encryption is used for all sensitive data with authenticated encryption to prevent tampering
- **Key derivation** uses PBKDF2 with 100,000+ iterations for additional security
- **Random number generation** uses cryptographically secure sources (crypto.getRandomValues, crypto.randomUUID)
- **Key storage** is handled securely with no plaintext keys ever stored

**🛡️ Data Protection:**
- **Local-only encryption** - All sensitive data is encrypted locally using AES-256 before any storage operations
- **Zero-knowledge architecture** - Encryption and decryption happen entirely on your device
- **No cloud storage** - No data is sent or stored externally - nothing leaves your machine
- **Memory protection** - Sensitive data is cleared from memory immediately after use
- **Secure deletion** - When items are deleted, they are securely wiped from storage

**🔒 Application Security:**
- **Input validation** - All user inputs are validated and sanitized to prevent injection attacks
- **Session management** - Secure session handling with automatic timeout and lock mechanisms
- **Access control** - Multi-factor authentication support with master key requirements
- **Audit logging** - Security events are logged locally for monitoring (no external transmission)

### Privacy & UID System

**Your privacy is our top priority.** The application generates unique identifiers (UIDs) for internal use, and we want you to understand how these work:

**🔍 UID Privacy Guarantees:**
- **UIDs are completely anonymous** - they contain no personal information, user data, or identifiable content
- **UIDs are cryptographically secure** - generated using SHA-256 one-way hash functions that cannot be reversed
- **UIDs are untraceable** - they cannot be used to identify you, your device, or your location
- **UIDs are machine-specific** - same vault on different devices gets different UIDs for enhanced privacy
- **UIDs are irreversible** - even with the UID, it's mathematically impossible to extract any original data

**⚙️ Technical Implementation:**
- **16-digit format** - UIDs are 16-digit numbers derived from a combination of your master key, random vault identifiers, and machine-specific data
- **SHA-256 hashing** - The SHA-256 hash function ensures complete one-way encryption - the original data cannot be reconstructed
- **Multiple entropy sources** - Combines master key, vault ID, salt, and machine data for maximum uniqueness
- **Collision resistance** - 16-digit space provides 10^16 possible values with negligible collision probability
- **No external transmission** - No personal information, browser data, or system specifications are ever transmitted or stored externally

### Security Best Practices

**🔐 For Users:**
- **Strong master passwords** - Use complex, unique passwords with high entropy
- **Regular backups** - Maintain secure backups of your encrypted vault
- **Device security** - Ensure your device is protected with strong authentication
- **Software updates** - Keep the application and your operating system updated
- **Physical security** - Protect your device from unauthorized physical access

**⚠️ Security Limitations:**
- **Local storage only** - No cloud synchronization or backup services
- **Single device** - Vaults are not automatically synced across devices
- **No recovery service** - Lost master keys cannot be recovered
- **Device compromise** - If your device is compromised, your vault may be at risk
- **No network security** - Application does not provide network-level security

### Cryptographic Standards

**📋 Compliance & Standards:**
- **NIST SP 800-63B** - Password requirements follow NIST guidelines
- **OWASP Top 10** - Application security follows OWASP best practices
- **FIPS 140-2** - Uses FIPS-approved cryptographic algorithms where applicable
- **AES-256** - Industry-standard encryption algorithm
- **Argon2** - Winner of the Password Hashing Competition (PHC)

**🔬 Security Analysis:**
- **Key derivation** - Argon2id provides resistance against GPU/ASIC attacks
- **Encryption strength** - AES-256 provides 256-bit security level
- **Hash function** - SHA-256 is cryptographically secure and collision-resistant
- **Random generation** - Uses system-provided cryptographically secure random number generators
- **Memory protection** - Sensitive data is handled with care to prevent memory dumps

**Your trust and privacy are paramount - we've designed this system to be completely anonymous and secure.**


**Built with ❤️ and a lot of substances (allegedly) by two developers who should probably stick to their day jobs.**

"it works on my machine" - jake

"fixed in beta" - luke
