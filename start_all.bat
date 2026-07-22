@echo off
echo ===================================================
echo   Starting AI Assistant Combined Application
echo ===================================================
echo.

echo [1/3] Starting Document Parsing Backend...
start "Document Parsing Backend" cmd /k "cd document_parsing_backend && npm run dev"
echo Waiting 5 seconds...
timeout /t 5 > nul

echo [2/3] Starting LangGraph Backend...
start "LangGraph Backend" cmd /k "cd LangGraph_backend && npm run dev"
echo Waiting 5 seconds...
timeout /t 5 > nul

echo [3/3] Starting Plixy Frontend...
start "Plixy Frontend" cmd /k "cd Plixy_frontend && npm run dev"

echo.
echo ===================================================
echo   All applications started successfully in separate windows!
echo ===================================================
pause
