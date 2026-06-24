param(
    [string]$HostName = "sarapriyain@192.168.0.64",
    [string]$RemoteDir = "/home/sarapriyain/AIMediaSuit",
    [string]$Branch = "main",
    [string]$ProcessName = "aimedia",
    [int]$Port = 8080,
    [string]$PublicUrl = "https://aimedia.velynxia.com"
)

$ErrorActionPreference = "Stop"

Write-Host "Starting Pi deploy..."
Write-Host "Host: $HostName"
Write-Host "Repo: $RemoteDir (branch: $Branch)"
Write-Host "Process: $ProcessName"

$remoteScript = @'
set -eu

REMOTE_DIR="$1"
BRANCH="$2"
PROCESS_NAME="$3"
PORT="$4"

cd "$REMOTE_DIR"

echo "[1/4] Pulling latest code"
git fetch origin "$BRANCH"
git pull --rebase --autostash origin "$BRANCH"

echo "[2/4] Installing dependencies"
npm install

echo "[3/5] Building production bundle"
npm run build

echo "[4/5] Restarting PM2 process"
if pm2 describe "$PROCESS_NAME" >/dev/null 2>&1; then
  pm2 restart "$PROCESS_NAME" --update-env
else
  pm2 start npm --name "$PROCESS_NAME" -- start
fi
pm2 save

echo "[5/5] Verifying local app health"
curl -fsS --retry 20 --retry-delay 1 --retry-all-errors "http://127.0.0.1:$PORT" >/dev/null
pm2 status "$PROCESS_NAME"
'@

$remoteScriptUnix = $remoteScript -replace "`r", ""
$remoteScriptUnix | ssh $HostName "bash -se -- '$RemoteDir' '$Branch' '$ProcessName' '$Port'"
if ($LASTEXITCODE -ne 0) {
  throw "Remote deploy failed with exit code $LASTEXITCODE"
}

if (-not [string]::IsNullOrWhiteSpace($PublicUrl)) {
    Write-Host "Checking public URL: $PublicUrl"
    $response = Invoke-WebRequest -Uri $PublicUrl -Method Head -UseBasicParsing
    Write-Host "Public URL status: $($response.StatusCode)"
}

Write-Host "Pi deploy completed successfully."
