#!/usr/bin/env bash
# Local deploy: build, smoke-test, and mirror dist/ to the host over FTP.
# Stopgap while the host firewall (BitNinja) blocks GitHub Actions runner IPs.
#
# Requires lftp (brew install lftp). FTP_SERVER, FTP_USERNAME and
# FTP_PASSWORD come from .env or the macOS Keychain (service
# "yardreport-ftp"). Anything missing is prompted for once and saved to
# the Keychain after a successful upload, so later runs don't ask.
#
# Usage: npm run deploy                 # build, verify, upload
#        npm run deploy -- --dry-run    # show what would change, upload nothing
#        npm run deploy -- --forget     # remove saved Keychain credentials
set -euo pipefail

cd "$(dirname "$0")/.."

REMOTE_DEPLOY_PATH="./public_html/yardreport/"
KEYCHAIN_SERVICE="yardreport-ftp"
DRY_RUN=""

kc_get() { security find-generic-password -s "$KEYCHAIN_SERVICE" -a "$1" -w 2>/dev/null || true; }
kc_set() { security add-generic-password -U -s "$KEYCHAIN_SERVICE" -a "$1" -w "$2" >/dev/null; }

case "${1:-}" in
  --dry-run) DRY_RUN="--dry-run" ;;
  --forget)
    for a in server username password; do
      security delete-generic-password -s "$KEYCHAIN_SERVICE" -a "$a" >/dev/null 2>&1 || true
    done
    echo "Removed saved FTP credentials from Keychain."
    exit 0 ;;
esac

command -v lftp >/dev/null || { echo "lftp not found — brew install lftp" >&2; exit 1; }

if [[ -f .env ]]; then
  set -a; source .env; set +a
fi
FTP_SERVER="${FTP_SERVER:-$(kc_get server)}"
FTP_USERNAME="${FTP_USERNAME:-$(kc_get username)}"
FTP_PASSWORD="${FTP_PASSWORD:-$(kc_get password)}"

# Prompt for anything still missing (password input is hidden).
PROMPTED=""
[[ -n "$FTP_SERVER" ]]   || { read -rp "FTP server: " FTP_SERVER; PROMPTED=1; }
[[ -n "$FTP_USERNAME" ]] || { read -rp "FTP username: " FTP_USERNAME; PROMPTED=1; }
if [[ -z "$FTP_PASSWORD" ]]; then
  read -rsp "FTP password: " FTP_PASSWORD; echo; PROMPTED=1
fi
for v in FTP_SERVER FTP_USERNAME FTP_PASSWORD; do
  [[ -n "${!v:-}" ]] || { echo "Missing $v" >&2; exit 1; }
done

npm run smoke

# Password goes through LFTP_PASSWORD so it never appears in lftp's args.
export LFTP_PASSWORD="$FTP_PASSWORD"
lftp -u "$FTP_USERNAME" --env-password "$FTP_SERVER" <<LFTP_EOF
  set ssl:verify-certificate false
  set ftp:ssl-allow true
  set net:timeout 30
  set net:max-retries 2
  mirror --reverse --delete --verbose $DRY_RUN ./dist/ ${REMOTE_DEPLOY_PATH}
  quit
LFTP_EOF

# Only reached if lftp succeeded, so typos never get saved.
if [[ -n "$PROMPTED" ]]; then
  kc_set server "$FTP_SERVER"
  kc_set username "$FTP_USERNAME"
  kc_set password "$FTP_PASSWORD"
  echo "Saved FTP credentials to Keychain (\"$KEYCHAIN_SERVICE\"). Future deploys won't prompt."
fi

if [[ -z "$DRY_RUN" ]]; then
  echo "Deployed. Checking live site..."
  curl -fsS -o /dev/null -w "https://www.briancsmith.org/yardreport/ -> %{http_code}\n" https://www.briancsmith.org/yardreport/
fi
