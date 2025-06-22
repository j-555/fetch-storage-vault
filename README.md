# Fetch Secure Vault 🗄️

> **Warning**: This project was built by two coders who are completely winging it and have absolutely no idea what they're doing. Proceed at your own risk.

## What the hell is this?

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
cd fetch-secure-vault

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

## A More Serious Note on Security
While this project is full of jokes, we do take data security seriously.
- Master Passwords are hashed using Argon2, a modern and secure key derivation function
- All sensitive data is encrypted locally using AES-256
- Encryption and decryption happen entirely on your device
- No data is sent or stored externally — nothing leaves your machine
  

**Built with ❤️ and a lot of caffeine by two developers who should probably stick to their day jobs.**

*"it works on my machine" - jake*

*"fixed in beta" - luke*
