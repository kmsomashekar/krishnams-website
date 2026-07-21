@echo off
cd /d "%~dp0"

echo.
echo Starting Resume Manager backup...
echo.

node backup-resume-manager.js

if errorlevel 1 (
    echo.
    echo Backup FAILED.
    echo Please review the error shown above.
    echo.
    pause
    exit /b 1
)

echo.
echo Backup completed successfully.
echo Remember to copy the latest dated backup folder
echo to OneDrive, Google Drive, or another safe location.
echo.
pause