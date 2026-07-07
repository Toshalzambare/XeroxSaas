
### Phase 4: CI/CD & GitOps Pipeline
``powershell
# 1. Create GitHub Actions Workflow file locally
New-Item -ItemType Directory -Force -Path .github\workflows
# (Created ci-cd.yml inside this folder using the agent)

# 2. Install ArgoCD into the local cluster (Server-Side Apply to handle large CRDs)
.\.bin\kubectl.exe create namespace argocd
.\.bin\kubectl.exe apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml --server-side --force-conflicts

# 3. Created the argocd-app.yaml manifest locally (Waiting to apply until code is pushed to GitHub)
``
