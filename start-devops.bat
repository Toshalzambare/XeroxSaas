@echo off
echo ========================================================
echo        XeroxSaaS - Start Local DevOps
echo ========================================================
echo.
echo Waking up the Kubernetes Docker container...
docker start kind-control-plane

echo.
echo ========================================================
echo Kubernetes is booting up!
echo It may take about 60 seconds for ArgoCD and your 
echo microservices to fully wake up and start accepting traffic.
echo ========================================================
pause
