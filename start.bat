@echo off
setlocal

cd /d "%~dp0"
set PORT=9000
set NEXTAUTH_URL=http://localhost:%PORT%
set AUTH_URL=http://localhost:%PORT%
set PUBLIC_APP_URL=http://localhost:%PORT%
set AUTH_TRUST_HOST=true

echo Starting OG-Block frontend on http://localhost:%PORT%
echo NEXTAUTH_URL=%NEXTAUTH_URL%
echo AUTH_URL=%AUTH_URL%
npm run dev -- --port %PORT%

endlocal
