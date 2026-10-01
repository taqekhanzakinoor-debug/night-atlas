@echo off
setlocal
cd /d "%~dp0"
if not exist ".env" copy /y ".env.example" ".env" >nul
echo Replace YOUR_GEMMA_API_KEY_HERE with your key in the file that opens.
echo Save and close Notepad, then restart Night Atlas.
echo This key is used only by the backend and is not sent to the webpage.
notepad.exe ".env"
