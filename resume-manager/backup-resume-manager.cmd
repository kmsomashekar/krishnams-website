@echo off
cd /d "%~dp0"

if /I "%~1"=="dev" goto validmode
if /I "%~1"=="prod" goto validmode

echo.
echo Job Search Manager Backup
echo =========================
echo.
echo Usage:
echo   backup-resume-manager.cmd dev
echo   backup-resume-manager.cmd prod
echo.
echo DEV  = Local development D1 and R2
echo PROD = Remote production D1 and R2
echo.
echo No backup was performed.
exit /b 1

:validmode
echo.
echo Starting Job Search Manager %~1 backup...
echo.

node backup-resume-manager.js %~1

if errorlevel 1 (
    echo.
    echo Backup FAILED.
    echo Please review the error shown above.
    echo.
    exit /b 1
)

echo.
echo Backup completed successfully.
echo Remember to copy the latest dated backup folder
echo to OneDrive, Google Drive, or another safe location.
echo.