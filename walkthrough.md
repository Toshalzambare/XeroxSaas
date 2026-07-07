# DevOps Setup Walkthrough & Command History

This document serves as a complete, start-to-finish record of every command executed to build your Enterprise-Grade Local DevOps Environment.

### Phase 1: Tooling & Local Kubernetes Cluster Setup
```powershell
# 1. Create a hidden isolated folder for our tools
New-Item -ItemType Directory -Force -Path .bin

# 2. Download 'kind' (Kubernetes IN Docker) executable
curl.exe -L -o .bin\kind.exe "https://kind.sigs.k8s.io/dl/v0.23.0/kind-windows-amd64"

# 3. Download 'kubectl' (Kubernetes Command Line interface)
curl.exe -L -C - -o .bin\kubectl.exe "https://dl.k8s.io/release/v1.30.0/bin/windows/amd64/kubectl.exe"

# 4. Download 'helm' (Kubernetes Package Manager)
curl.exe -L -o .bin\helm.zip "https://get.helm.sh/helm-v3.15.2-windows-amd64.zip"
Expand-Archive -Force -Path ".bin\helm.zip" -DestinationPath ".bin\helm-temp"
Move-Item -Force -Path ".bin\helm-temp\windows-amd64\helm.exe" -Destination ".bin\helm.exe"
Remove-Item -Recurse -Force ".bin\helm-temp"
Remove-Item -Force ".bin\helm.zip"

# 5. Spin up the local Kubernetes cluster using our custom kind-config.yaml
.\.bin\kind.exe create cluster --config kind-config.yaml

# 6. Install the NGINX Ingress Controller to route http://localhost traffic
.\.bin\kubectl.exe apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
```

### Phase 2: Enterprise Manifests & Secrets
```powershell
# 1. Create a logical namespace for our application
.\.bin\kubectl.exe create namespace xerox

# 2. Inject GitHub PAT so the cluster can pull private images from GHCR
.\.bin\kubectl.exe create secret docker-registry ghcr-login-secret --docker-server=ghcr.io --docker-username=Toshalzambare --docker-password=<YOUR_TOKEN> --docker-email=Toshalzambare@example.com --namespace=xerox

# 3. Add the Bitnami helm repository
.\.bin\helm.exe repo add bitnami https://charts.bitnami.com/bitnami
.\.bin\helm.exe repo update

# 4. Install SealedSecrets to safely manage encrypted environment variables
.\.bin\helm.exe install sealed-secrets bitnami/sealed-secrets --namespace kube-system
```

### Phase 3: Observability (Metrics & Logs)
```powershell
# 1. Install Metrics Server (required for HPA autoscaling) with insecure TLS patch for local use
.\.bin\kubectl.exe apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
.\.bin\kubectl.exe patch -n kube-system deployment metrics-server --type=json -p="[{\"op\":\"add\",\"path\":\"/spec/template/spec/containers/0/args/-\",\"value\":\"--kubelet-insecure-tls\"}]"

# 2. Add Monitoring Helm Repositories
.\.bin\helm.exe repo add prometheus-community https://prometheus-community.github.io/helm-charts
.\.bin\helm.exe repo add grafana https://grafana.github.io/helm-charts
.\.bin\helm.exe repo update

# 3. Install Prometheus & Grafana (PLG Stack) and expose Grafana on grafana.localhost
.\.bin\helm.exe install monitoring prometheus-community/kube-prometheus-stack --namespace monitoring --create-namespace --set grafana.ingress.enabled=true --set grafana.ingress.ingressClassName=nginx --set "grafana.ingress.hosts[0]=grafana.localhost"

# 4. Install Loki & Promtail for centralized log aggregation
.\.bin\helm.exe install loki grafana/loki-stack --namespace monitoring --set grafana.enabled=false --set promtail.enabled=true

# 5. Patch Loki ConfigMap to fix a default datasource conflict with Prometheus
.\.bin\kubectl.exe apply -f .\.bin\loki-cm.yaml
.\.bin\kubectl.exe delete pod -n monitoring -l app.kubernetes.io/name=grafana

# 6. Retrieve the auto-generated Grafana Admin Password
.\.bin\kubectl.exe get secret --namespace monitoring monitoring-grafana -o jsonpath="{.data.admin-password}"
```

### Phase 4: CI/CD & GitOps (Upcoming)
```powershell
# Commands will be logged here as we execute Phase 4!
```
