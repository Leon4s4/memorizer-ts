# Publishing Guide

This guide explains how to publish Memorizer packages to npm.

## Prerequisites

### 1. NPM Account

Create an npm account if you don't have one:
```bash
npm adduser
```

### 2. Organization (Optional)

Create `@memorizer` organization on npmjs.com for scoped packages.

### 3. Access Rights

Ensure you have publish access to:
- `@memorizer/shared`
- `@memorizer/server`

## Pre-Publishing Checklist

Before publishing, ensure:

- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Linting passes: `npm run lint`
- [ ] Version numbers updated in all `package.json` files
- [ ] CHANGELOG.md updated with release notes
- [ ] README.md reflects current version
- [ ] LICENSE file present
- [ ] All dependencies use proper versions (no `workspace:*`)

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (2.0.0): Breaking changes
- **MINOR** (2.1.0): New features, backwards compatible
- **PATCH** (2.0.1): Bug fixes, backwards compatible

## Publishing Process

### Option 1: Automated (GitHub Actions)

**Recommended for production releases.**

1. **Update versions**:
```bash
# In each package directory
npm version patch  # or minor, or major
```

2. **Commit and tag**:
```bash
git add .
git commit -m "Release v2.0.0"
git tag v2.0.0
git push origin main --tags
```

3. **Create GitHub Release**:
- Go to GitHub Releases
- Click "Create a new release"
- Select tag `v2.0.0`
- Title: `v2.0.0`
- Description: Copy from CHANGELOG.md
- Click "Publish release"

4. **Automated publish**:
- GitHub Actions workflow triggers
- Runs tests
- Builds packages
- Publishes to npm

5. **Verify**:
```bash
npm view @memorizer/server
npm view @memorizer/shared
```

### Option 2: Manual Publishing

**For testing or emergency releases.**

1. **Build all packages**:
```bash
npm run build
```

2. **Publish shared package first**:
```bash
cd packages/shared
npm publish --access public
```

3. **Publish server package**:
```bash
cd packages/server
npm publish --access public
```

4. **Verify installation**:
```bash
npx @memorizer/server@latest --version
```

## Publishing Beta Versions

For pre-release testing:

1. **Update version with beta tag**:
```bash
npm version 2.1.0-beta.1
```

2. **Publish with tag**:
```bash
npm publish --tag beta --access public
```

3. **Install beta**:
```bash
npx @memorizer/server@beta
```

4. **List versions**:
```bash
npm dist-tag ls @memorizer/server
```

## Post-Publishing Steps

After successful publish:

1. **Announce** on:
   - GitHub Discussions
   - Twitter/X
   - Reddit (r/node, r/typescript, r/MachineLearning)
   - Hacker News

2. **Update documentation**:
   - README.md version badges
   - Website (if applicable)
   - Examples and tutorials

3. **Monitor**:
   - npm download stats
   - GitHub issues
   - User feedback

## Troubleshooting

### Error: "You cannot publish over the previously published versions"

**Cause**: Version already exists on npm.

**Solution**: Bump version number:
```bash
npm version patch
npm publish
```

### Error: "You do not have permission to publish"

**Cause**: Not logged in or no access rights.

**Solution**:
```bash
npm login
# OR request access from package owner
```

### Error: "Package name too similar to existing package"

**Cause**: npm prevents typosquatting.

**Solution**: Use scoped package (`@memorizer/server` vs `memorizer-server`)

### Error: "postinstall script failed"

**Cause**: postinstall.js has errors.

**Solution**: Test locally first:
```bash
node packages/server/scripts/postinstall.js
```

## CI/CD Setup

### GitHub Secrets

Add to repository secrets:

1. **NPM_TOKEN**:
   - Generate: `npm token create`
   - Add to: Settings → Secrets → Actions
   - Name: `NPM_TOKEN`
   - Value: `npm_xxxxx...`

2. **Verify workflow**:
   - `.github/workflows/publish.yml` exists
   - Uses `NPM_TOKEN` secret
   - Runs on release creation

### Workflow Trigger

Publish workflow triggers on:
- GitHub Release creation
- Manual dispatch (`workflow_dispatch`)

## Package Size Monitoring

Keep package size reasonable:

```bash
# Check packed size
npm pack --dry-run

# Analyze bundle
npx package-size-analyzer
```

**Target sizes**:
- `@memorizer/shared`: <100KB
- `@memorizer/server`: <1MB (without models)
- Models downloaded post-install: ~920MB

## Unpublishing (Emergency Only)

**⚠️ Avoid unpublishing if possible.**

If you must unpublish within 72 hours:

```bash
npm unpublish @memorizer/server@2.0.0
```

**Better**: Deprecate instead:
```bash
npm deprecate @memorizer/server@2.0.0 "Critical bug, use 2.0.1+"
```

## Release Checklist

Complete checklist for each release:

### Pre-Release

- [ ] All features complete and tested
- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md has release notes
- [ ] Version bumped in all packages
- [ ] No `TODO` or `FIXME` in critical code
- [ ] Performance benchmarks run
- [ ] Security scan passed (`npm audit`)

### Release

- [ ] Tag created (`git tag v2.0.0`)
- [ ] GitHub Release published
- [ ] CI/CD pipeline green
- [ ] Packages published to npm
- [ ] Installation tested (`npx @memorizer/server`)

### Post-Release

- [ ] GitHub Release announced
- [ ] Social media posts
- [ ] Documentation site updated
- [ ] Monitor for issues (24-48 hours)
- [ ] Close milestone
- [ ] Plan next release

## Version History

Track all published versions:

| Version | Date | Type | Notes |
|---------|------|------|-------|
| 2.0.0 | 2025-XX-XX | Major | Initial TypeScript release |
| 2.0.1 | TBD | Patch | Bug fixes |
| 2.1.0 | TBD | Minor | New features |

## Rollback Plan

If a release has critical issues:

1. **Publish hotfix immediately**:
```bash
npm version patch
npm publish
```

2. **Deprecate bad version**:
```bash
npm deprecate @memorizer/server@2.0.0 "Critical bug, use 2.0.1"
```

3. **Notify users**:
   - GitHub issue
   - Release notes
   - Social media

4. **Post-mortem**:
   - Document what went wrong
   - Update CI/CD to prevent recurrence
   - Add tests for the bug

## npm Commands Reference

```bash
# Login
npm login

# View package info
npm view @memorizer/server

# List published versions
npm view @memorizer/server versions

# Check what will be published
npm pack --dry-run

# Publish with specific tag
npm publish --tag beta

# Update dist-tag
npm dist-tag add @memorizer/server@2.0.1 latest

# Deprecate version
npm deprecate @memorizer/server@2.0.0 "Use 2.0.1"

# Unpublish (within 72 hours only)
npm unpublish @memorizer/server@2.0.0
```

## Best Practices

1. **Never publish from `main` directly** - Use releases/tags
2. **Always test install** before announcing
3. **Use semantic versioning** strictly
4. **Keep CHANGELOG** up to date
5. **Automated publishing** via CI/CD
6. **Monitor download stats** after release
7. **Respond to issues** quickly (within 24 hours)
8. **Deprecate** instead of unpublish when possible

## Questions?

- 📖 npm docs: https://docs.npmjs.com/
- 🔖 Semantic Versioning: https://semver.org/
- 🤖 GitHub Actions: https://docs.github.com/en/actions

## Support

For publishing issues:
- GitHub Issues: https://github.com/yourusername/memorizer-ts/issues
- npm Support: https://www.npmjs.com/support
