#!/usr/bin/env bash
# Local deploy: build, smoke-test, and mirror dist/ to the host over FTP.
# Stopgap while the host firewall (BitNinja) blocks GitHub Actions runner IPs.
#
# Requires lftp (brew install lftp). FTP_SERVER, FTP_USERNAME and
# FTP_PASSWORD are read from .env (gitignored) if present; anything
# missing is prompted for at run time.
#
# Usage: npm run deploy            # build, verify, upload
#        npm run deploy -- --dry-run   # show what would change, upload nothing
set -euo pipefail

cd "$(dirname "$0")/.."

REMOTE_DEPLOY_PATH="./public_html/yardreport/"
DRY_RUN=""
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN="--dry-run"

command -v lftp >/dev/null || { echo "lftp not found — brew install lftp" >&2; exit 1; }

if [[ -f .env ]]; then
  set -a; source .env; set +a
fi
# Prompt for anything not in .env (password input is hidden).
[[ -n "${FTP_SERVER:-}" ]]   || read -rp "FTP server: " FTP_SERVER
[[ -n "${FTP_USERNAME:-}" ]] || read -rp "FTP username: " FTP_USERNAME
if [[ -z "${FTP_PASSWORD:-}" ]]; then
  read -rsp "FTP password: " FTP_PASSWORD; echo
fi
for v in FTP_SERVER FTP_USERNAME FTP_PASSWORD; do
  [[ -n "${!v:-}" ]] || { echo "Missing $v" >&2; exit 1; }
done

npm run smoke

# Password goes through LFTP_PASSWORD so it never appears in process args.
export LFTP_PASSWORD="$FTP_PASSWORD"
lftp -u "$FTP_USERNAME" --env-password "$FTP_SERVER" <<LFTP_EOF
  set ssl:verify-certificate false
  set ftp:ssl-allow true
  set net:timeout 30
  set net:max-retries 2
  mirror --reverse --delete --verbose $DRY_RUN ./dist/ ${REMOTE_DEPLOY_PATH}
  quit
LFTP_EOF

if [[ -z "$DRY_RUN" ]]; then
  echo "Deployed. Checking live site..."
  curl -fsS -o /dev/null -w "https://www.briancsmith.org/yardreport/ -> %{http_code}\n" https://www.briancsmith.org/yardreport/
fi
