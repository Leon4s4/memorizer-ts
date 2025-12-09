# Security Policy

## Supported Versions

Currently supported versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

We take the security of Memorizer seriously. If you discover a security vulnerability, please follow these steps:

### Private Disclosure (Preferred)

1. **DO NOT** open a public GitHub issue
2. Use GitHub's [Private Security Advisories](https://github.com/Leon4s4/memorizer-ts/security/advisories/new)
3. Or email: [Add your security contact email]

### What to Include

Please provide:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: Within 24-48 hours
  - High: Within 1 week
  - Medium: Within 2 weeks
  - Low: Next release cycle

## Security Considerations

### Deployment Security

Memorizer is designed as a **local-first, airgapped application**. For secure deployment:

#### Local/Personal Use (Default)
✅ **Secure** - No additional configuration needed
- Runs locally on `localhost`
- No authentication required
- Data stored in `~/.memorizer/data/`

#### Production/Multi-User Deployment
⚠️ **Requires Additional Security**:

1. **Reverse Proxy with Authentication**
   ```nginx
   location /memorizer {
       auth_basic "Restricted";
       auth_basic_user_file /etc/nginx/.htpasswd;
       proxy_pass http://localhost:5000;
   }
   ```

2. **CORS Configuration**
   ```bash
   export MEMORIZER_CORS_ORIGINS="https://yourdomain.com"
   ```

3. **TLS/SSL Encryption**
   - Always use HTTPS in production
   - Use Let's Encrypt or similar

4. **Network Isolation**
   - Bind to localhost only: `--host 127.0.0.1`
   - Use VPN for remote access
   - Consider containerization (Docker)

### Data Security

#### Data at Rest
- Data stored unencrypted in `~/.memorizer/data/`
- Use filesystem encryption for sensitive data:
  - macOS: FileVault
  - Linux: LUKS/dm-crypt
  - Windows: BitLocker

#### Data in Transit
- Local-only by default (no network exposure)
- Use HTTPS if exposing to network
- MCP uses stdio (no network transport)

### MCP Security

The MCP server is secure by design:
- ✅ stdio transport (no network exposure)
- ✅ Local process communication only
- ✅ No remote access
- ✅ Inherits security of host application

### API Security

Current API has **no authentication**. For production use:

1. **Add API Key Middleware**
2. **Use JWT Tokens**
3. **Implement Rate Limiting**
4. **Add Request Validation**

See [SECURITY_AUDIT.md](SECURITY_AUDIT.md) for detailed recommendations.

## Security Best Practices

### For Users

1. **Keep Dependencies Updated**
   ```bash
   npm update
   npm audit
   ```

2. **Use Environment Variables**
   - Never commit `.env` files
   - Use strong, unique values

3. **Secure Your System**
   - Keep OS updated
   - Use firewall
   - Enable filesystem encryption

4. **Backup Regularly**
   ```bash
   memorizer backup --output ~/backups/memorizer-$(date +%Y%m%d).zip
   ```

### For Contributors

1. **Run Security Audit**
   ```bash
   npm audit
   npm audit fix
   ```

2. **Check for Secrets**
   ```bash
   git grep -i "password\|secret\|key" | grep -v node_modules
   ```

3. **Validate Input**
   - Always validate user input
   - Use TypeScript types
   - Add schema validation

4. **Follow Secure Coding**
   - No `eval()` or `new Function()`
   - Sanitize all external input
   - Use parameterized queries
   - Avoid XSS vectors

## Known Security Limitations

### Current Limitations

1. **No Built-in Authentication**
   - Suitable for local/personal use only
   - Requires reverse proxy for production

2. **No Data Encryption**
   - Data stored in plaintext
   - Use filesystem encryption for sensitive data

3. **No Rate Limiting**
   - Could be abused if exposed publicly
   - Add rate limiting for production

4. **Development Dependencies**
   - Some dev dependencies have known vulnerabilities
   - Production builds are not affected

### Mitigations

These limitations are **by design** for local-first, airgapped operation:
- ✅ No cloud connections
- ✅ No telemetry
- ✅ No external API calls
- ✅ Fully self-contained

## Security Audit

Last audit: December 9, 2025
Next scheduled audit: March 9, 2026

See [SECURITY_AUDIT.md](SECURITY_AUDIT.md) for full report.

## Dependencies Security

We regularly monitor dependencies for vulnerabilities:

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Fix vulnerabilities
npm audit fix
```

### Production Dependencies
All production dependencies are reviewed for:
- Known vulnerabilities (CVE database)
- Active maintenance
- Security track record
- License compatibility

### Development Dependencies
Development dependencies may have known issues that do not affect production builds.

## Security Tools

Recommended security tools:

1. **npm audit** - Built-in vulnerability scanning
2. **Snyk** - Continuous vulnerability monitoring
3. **OWASP ZAP** - Web application security testing
4. **SonarQube** - Code quality and security analysis

## Contact

Security Team: [Add contact information]
- Email: security@yourdomain.com
- PGP Key: [Add PGP key if applicable]

## Acknowledgments

We appreciate security researchers who responsibly disclose vulnerabilities. Contributors will be acknowledged (with permission) in:
- Security advisories
- Release notes
- Hall of fame (if applicable)

---

**Last Updated**: December 9, 2025
**Version**: 2.0.0
