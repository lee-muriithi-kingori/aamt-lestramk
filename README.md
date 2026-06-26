# AAMT Lestramk CLI

Official command-line interface for [AAMT](https://aamt-lestramk.vercel.app) — Africa's Talent Marketplace.

Manage your profile, resumes, job applications, and more — directly from your terminal.

## Installation

```bash
npm install -g aamt-lestramk
```

Or use without installing:

```bash
npx aamt-lestramk <command>
```

## Quick Start

```bash
# Authenticate
aamt auth login

# View your profile
aamt whoami

# List available jobs
aamt jobs list

# Upload your resume
aamt resume upload ~/Documents/resume.pdf --title "My Resume" --primary

# Search for jobs
aamt jobs search "software engineer"

# Apply to a job
aamt jobs apply <job-id> --resume <resume-id>

# Check your applications
aamt applications list
```

## Authentication

The CLI uses API keys for authentication. Keys are stored securely in `~/.config/aamt/credentials.yml` with `0600` permissions.

### Getting an API Key

1. Log in to [AAMT](https://aamt-lestramk.vercel.app)
2. Go to **Settings → Security → API Keys**
3. Click **Generate New Key**
4. Choose the scopes (permissions) you want
5. Copy the key and paste it when running `aamt auth login`

### Login

```bash
# Interactive login (prompts for API key)
aamt auth login

# Login with key directly
aamt auth login --token your-api-key-here

# Login pointing to a different instance
aamt auth login --host https://your-instance.vercel.app
```

### Scopes

When creating an API key, you can choose from these scopes:

| Scope | Description |
|-------|-------------|
| `read:profile` | Read your profile information |
| `write:profile` | Update your profile |
| `read:resumes` | Read your resumes |
| `write:resumes` | Upload and manage resumes |
| `read:jobs` | Search and view jobs |
| `write:applications` | Apply to jobs |
| `read:applications` | View your applications |
| `read:notifications` | Read notifications |
| `read:messages` | Read messages |
| `write:messages` | Send messages |
| `read:earnings` | View earnings and payouts |

### Logout

```bash
aamt auth logout
```

## Commands

### `aamt auth` — Authentication

| Command | Description |
|---------|-------------|
| `aamt auth login` | Authenticate with API key |
| `aamt auth logout` | Remove stored credentials |
| `aamt auth status` | Show authentication status |
| `aamt auth refresh` | Verify and refresh credentials |
| `aamt auth scopes` | List available API scopes |

### `aamt resume` — Resume Management

| Command | Description |
|---------|-------------|
| `aamt resume list` | List your resumes |
| `aamt resume upload <file>` | Upload a resume (PDF/DOCX) |
| `aamt resume download <id>` | Download a resume |
| `aamt resume primary <id>` | Set primary resume |
| `aamt resume delete <id>` | Delete a resume |

Upload options:
```bash
aamt resume upload resume.pdf --title "Senior Dev Resume" --primary
```

### `aamt jobs` — Job Browsing

| Command | Description |
|---------|-------------|
| `aamt jobs list` | List available jobs |
| `aamt jobs view <id>` | View job details |
| `aamt jobs search <query>` | Search for jobs |
| `aamt jobs apply <id>` | Apply to a job |
| `aamt jobs save <id>` | Save a job |
| `aamt jobs unsave <id>` | Remove saved job |

Search & filter:
```bash
aamt jobs search "react developer" --location "Nairobi" --remote
aamt jobs list --type "full-time" --location "Remote"
```

### `aamt profile` — Profile Management

| Command | Description |
|---------|-------------|
| `aamt profile view` | View your profile |
| `aamt profile edit` | Edit profile interactively |

### `aamt applications` — Applications

| Command | Description |
|---------|-------------|
| `aamt applications list` | List your applications |
| `aamt applications status <id>` | View application details |

### `aamt config` — Configuration

| Command | Description |
|---------|-------------|
| `aamt config get <key>` | Get a config value |
| `aamt config set <key> <value>` | Set a config value |
| `aamt config list` | List all config |
| `aamt config show` | Show full config (masked) |
| `aamt config reset` | Reset to defaults |

### Other Commands

| Command | Description |
|---------|-------------|
| `aamt whoami` | Show authenticated user |
| `aamt status` | Check API status |
| `aamt --version` | Show CLI version |

## Global Options

| Option | Description |
|--------|-------------|
| `-H, --host <host>` | Override API host |
| `-j, --json` | Output as JSON |
| `-c, --csv` | Output as CSV |
| `--verbose` | Show verbose output |
| `--quiet` | Suppress non-error output |

## Configuration

Configuration is stored in `~/.config/aamt/config.yml`:

```yaml
apiHost: https://aamt-lestramk.vercel.app
apiVersion: v1
defaultOutput: table
theme: auto
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `AAMT_HOST` | Override the API host |
| `AAMT_TOKEN` | Override the stored API key |

## File Locations

| File | Location |
|------|----------|
| Config | `~/.config/aamt/config.yml` |
| Credentials | `~/.config/aamt/credentials.yml` (mode 0600) |
| Hosts | `~/.config/aamt/hosts.yml` |

## Development

```bash
git clone https://github.com/lee-muriithi-kingori/aamt-lestramk.git
cd aamt-lestramk
npm install
npm run build
```

## License

MIT © Lee Muriithi Kingori
