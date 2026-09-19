@echo off
echo ========================================================
echo        XeroxSaaS - Stop Local DevOps
echo ========================================================
echo.
echo Stopping the Kubernetes Docker container to save your system RAM and CPU...
docker stop kind-control-plane

echo.
echo ========================================================
echo Kubernetes has been paused safely! 
echo All your databases and files are preserved on disk.
echo ========================================================
pause
