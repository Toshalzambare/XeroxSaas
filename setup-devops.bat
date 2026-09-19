@echo off
echo ========================================================
echo        XeroxSaaS - Local DevOps Setup Script
echo ========================================================
echo.
echo Deleting old cluster (if exists) to ensure a clean slate...
.\.bin\kind.exe delete cluster

echo.
echo Creating new Kubernetes (KinD) cluster with port bindings...
.\.bin\kind.exe create cluster --config kind-config.yaml

echo.
echo Installing NGINX Ingress Controller...
.\.bin\kubectl.exe apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

echo.
echo Waiting 15 seconds for Ingress to initialize...
timeout /t 15 /nobreak >nul

echo.
echo Installing ArgoCD (GitOps)...
.\.bin\kubectl.exe create namespace argocd
.\.bin\kubectl.exe apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

echo.
echo Waiting 10 seconds for ArgoCD CRDs to register...
timeout /t 10 /nobreak >nul

echo.
echo Installing Metrics Server (Required for HPA Autoscaling)...
.\.bin\kubectl.exe apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
.\.bin\kubectl.exe patch deployment metrics-server -n kube-system --type="json" -p="[{\"op\": \"add\", \"path\": \"/spec/template/spec/containers/0/args/-\", \"value\": \"--kubelet-insecure-tls\"}]"

echo.
echo Connecting ArgoCD to the XeroxSaaS Git Repository...
.\.bin\kubectl.exe apply -f k8s/argocd-app.yaml

echo.
echo ========================================================
echo SETUP COMPLETE! 
echo ArgoCD is now running in the background and downloading 
echo all your microservices (MongoDB, Redis, Node, React).
echo You can run ".\.bin\kubectl.exe get pods -A" to watch it load!
echo ========================================================
pause
