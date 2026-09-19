# DevOps Explanation Log — XeroxSaaS

> **What is this file?**  
> Every DevOps change made to this project is logged here with a full explanation of *what* was done, *why*, and *how*.  
> This file is **append-only** — nothing is deleted or edited, only new entries are added at the bottom.

---

## Entry 1: Created `local-devops` Branch

**Date:** 2026-07-07  
**Command:** `git checkout -b local-devops`

### What?
Created a new Git branch called `local-devops` from the current `deployment-ready` branch.

### Why?
Branches let you work on new features without breaking the main/working code. The `local-devops` branch will hold all our DevOps infrastructure (CI/CD pipeline, Kubernetes manifests, monitoring stack) separately from the production-deployed code.

### How it works:
- `git checkout -b <name>` = create a new branch AND switch to it in one command.
- All commits we make now go to `local-devops`, not `deployment-ready`.
- We can always switch back with `git checkout deployment-ready`.

---

## Entry 2: Added Test Framework (Jest + Supertest)

**Date:** 2026-07-07  
**Files changed:** `backend/package.json`, `backend/jest.config.js`, `backend/tsconfig.test.json`  
**New directory:** `backend/src/__tests__/`

### What?
Set up a testing framework for the backend so we can write automated tests that verify our code works correctly.

### Why?
- **CI/CD pipelines need tests** — a CI pipeline that only builds but never tests is not useful. If something breaks, the pipeline should catch it *before* deployment.
- **Confidence** — when you change code, you can run tests to verify you didn't break anything.
- **Industry standard** — every professional project has automated tests.

### Tools chosen:
| Tool | Purpose | Why this one? |
|------|---------|---------------|
| **Jest** | Test runner + assertion library | Most popular JS testing framework. Comes with everything built-in (mocking, assertions, coverage). |
| **ts-jest** | TypeScript support for Jest | Lets us write tests in TypeScript directly without compiling first. |
| **Supertest** | HTTP endpoint testing | Lets us send fake HTTP requests to our Express app without actually starting a server. Perfect for testing API routes. |
| **mongodb-memory-server** | In-memory MongoDB | Spins up a real MongoDB instance in RAM. No Docker needed, no external DB. Tests are fast and isolated. |

### How it works:
1. `jest.config.js` tells Jest: "use ts-jest to compile TypeScript, look for files ending in `.test.ts`"
2. `tsconfig.test.json` extends the main tsconfig but adds test-specific settings
3. Each test file in `__tests__/` uses `supertest` to call our Express endpoints and checks the responses

### Key concept — Test Isolation:
Each test file starts a fresh in-memory MongoDB. This means:
- Tests don't interfere with each other
- Tests don't need Docker or a running DB
- Tests run in parallel safely

---

## Entry 3: Written Test Suites

**Date:** 2026-07-07  
**New files:**
- `backend/src/__tests__/setup.ts` — Global test setup/teardown
- `backend/src/__tests__/health.test.ts` — Health check tests
- `backend/src/__tests__/auth.test.ts` — Authentication tests
- `backend/src/__tests__/security.test.ts` — Security middleware tests (unit tests)

### What?
Created 3 test suites covering different layers of the application:

#### Suite 1: Health Check (basic)
- Tests that `GET /` returns `{ status: 'Active' }` — the simplest possible test
- Verifies the server starts and responds

#### Suite 2: Authentication (proper/integration)
Tests the full auth flow:
- **Register User** — valid registration returns 201 + JWT token
- **Duplicate Email** — registering same email twice returns 400
- **Missing Fields** — incomplete registration returns 400
- **Weak Password** — password without uppercase/number/special char gets rejected
- **Login** — correct credentials return 200 + token
- **Login Fail** — wrong password returns 401
- **Register Shop Owner** — OWNER role registration works

#### Suite 3: Security (unit tests)
Tests the utility functions directly (no HTTP, no DB):
- `validatePassword()` — verifies all password rules
- `sanitizeFilename()` — verifies path traversal prevention
- `isValidStorageKey()` — verifies S3 key validation

### Why these specific tests?
| Test Type | What it proves | CI value |
|-----------|---------------|----------|
| Health check | "The server boots" | Catches crashes, missing env vars |
| Auth integration | "Core business logic works" | Catches DB schema changes, JWT bugs, validation regressions |
| Security unit | "Security functions aren't broken" | Catches accidental weakening of security rules |

### How `setup.ts` works:
```
beforeAll() → Start in-memory MongoDB → Connect mongoose
afterAll() → Disconnect → Stop MongoDB
beforeEach() → Clear all collections (fresh state per test)
```

---

## Entry 4: Created GitHub Actions CI/CD Pipeline

**Date:** 2026-07-07  
**New file:** `.github/workflows/ci.yml`

### What?
A GitHub Actions workflow that automatically runs on every push to `local-devops`.

### Why?
**CI/CD = Continuous Integration / Continuous Delivery.** It means:
- **CI**: Every time you push code, it's automatically checked (linted, built, tested, scanned)
- **CD**: If all checks pass, the code is automatically deployed (we'll add this in Phase 2 with K8s)

Without CI/CD, you have to manually run tests, manually build, manually check for security issues. With CI/CD, all of this happens automatically in ~3 minutes.

### Pipeline Stages:

```
Push to local-devops
        │
        ▼
┌──────────────────────┐
│  Stage 1: LINT       │  ← Checks code quality
│  - tsc --noEmit      │     (TypeScript errors)
│  - eslint (frontend) │     (Code style)
└──────────┬───────────┘
           │ (passes?)
           ▼
┌──────────────────────┐
│  Stage 2: TEST       │  ← Runs automated tests
│  - jest              │     (health, auth, security)
│  - mongodb-memory    │     (no real DB needed!)
└──────────┬───────────┘
           │ (passes?)
           ▼
┌──────────────────────┐
│  Stage 3: BUILD      │  ← Builds Docker images
│  - docker build BE   │     (verifies Dockerfile works)
│  - docker build FE   │
└──────────┬───────────┘
           │ (passes?)
           ▼
┌──────────────────────┐
│  Stage 4: SECURITY   │  ← Scans for vulnerabilities
│  - trivy scan BE     │     (CVEs in dependencies)
│  - trivy scan FE     │     (known security issues)
└──────────┬───────────┘
           │ (passes?)
           ▼
┌──────────────────────┐
│  Stage 5: PUSH       │  ← Pushes to ghcr.io
│  - docker push BE    │     (container registry)
│  - docker push FE    │
└──────────────────────┘
```

### Key concepts explained:

**GitHub Actions** — Free CI/CD service built into GitHub. You define workflows in YAML files under `.github/workflows/`. GitHub reads these files and runs them on their servers (called "runners") whenever the trigger condition is met (e.g., push to a branch).

**Trivy** — Open-source security scanner by Aqua Security. It scans Docker images for known vulnerabilities (CVEs) in OS packages and application dependencies. Think of it as an antivirus for your Docker images.

**ghcr.io (GitHub Container Registry)** — Free container registry (like Docker Hub) provided by GitHub. You push Docker images here so they can be pulled by your Kubernetes cluster later.

**How to get your GitHub Token (for ghcr.io push):**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name like "xerox-devops"
4. Select scopes: `write:packages`, `read:packages`, `delete:packages`
5. Click "Generate token"
6. Copy the token (you'll only see it once!)
7. Go to your repo → Settings → Secrets and variables → Actions
8. Click "New repository secret"
9. Name: `CR_PAT`, Value: paste your token
10. Save

### How the YAML works (line by line):
- `on: push: branches: [local-devops]` — Only run when code is pushed to this branch
- `jobs:` — Each job runs on a separate virtual machine
- `runs-on: ubuntu-latest` — Uses a free Ubuntu machine provided by GitHub
- `steps:` — Sequential commands to execute
- `uses: actions/checkout@v4` — Clones your repo onto the runner
- `needs: [lint]` — This job waits for the `lint` job to pass first


### Phase 1: Fixing Code to Pass Tests

During the integration testing, two issues were identified and fixed:

1. **Rate Limiting Crash (securityMiddleware.ts)**: The tests failed to run because express-rate-limit threw an ERR_ERL_KEY_GEN_IPV6 error. This happened because the code used a custom keyGenerator that read eq.ip but didn't correctly normalize IPv6 addresses. This would have actually crashed your production app on startup too! To fix this, I removed the custom keyGenerator. Since your server.ts has pp.set('trust proxy', 1);, Express already automatically extracts the correct IP from the X-Forwarded-For proxy header into eq.ip. The default express-rate-limit keyGenerator automatically uses eq.ip and handles IPv6 securely, so removing your custom code made it safer and kept the exact same proxy behavior.

2. **MongoDB In-Memory Server Corrupted Cache**: Your tests kept failing because of a corrupted mongodb-memory-server download cache in your global Windows AppData. To bypass this, I installed cross-env and updated package.json to run tests with cross-env MONGOMS_DOWNLOAD_DIR=./.mongo-cache. This forces the test database binary to download locally into a .mongo-cache folder inside the project, guaranteeing a fresh, uncorrupted database for testing.

3. **Added Error Logging (generateToken.ts)**: I wrapped the token generation logic in a 	ry...catch block to improve error logging. It doesn't change how tokens are generated, it just ensures that if anything ever fails there, it will print exactly why to the console.

**Status**: All 27 integration tests are now passing successfully.

### Phase 1: Local Kubernetes Cluster Setup

To spin up an enterprise-grade orchestration environment locally without cluttering your system, we took an isolated approach:

1. **Isolated Tooling**: We downloaded the raw .exe binaries for kind, kubectl, and helm straight into a hidden .bin folder. This means there are no global installations on your machine.
2. **Cluster Creation**: We created a custom kind-config.yaml that maps port 80 and 443 from your Windows host into the Docker containers. Then, we used kind to boot up the cluster. The cluster itself is running entirely inside Docker containers (kind-control-plane), keeping everything self-contained.
3. **Ingress Controller**: To avoid accessing your apps on weird randomized ports (like localhost:31254), we installed the **NGINX Ingress Controller** directly into the cluster. This acts as a reverse proxy router, meaning you will be able to access your frontend and backend seamlessly via standard http://localhost routes.

### Phase 2: Writing Enterprise Kubernetes Manifests

In this phase, we translated your architecture into declarative Kubernetes YAML manifests (located in the k8s/ folder).

1. **Namespace & Secrets**: We created the xerox namespace to logically group your app. We also injected your GitHub token directly into the cluster as a secret (ghcr-login-secret). This allows your local cluster to pull private Docker images directly from your GitHub Container Registry! 
2. **StatefulSets (MongoDB & Redis)**: For databases, standard Deployments aren't safe because data gets wiped when pods restart. We used StatefulSet and configured Persistent Volume Claims (PVCs) so your data survives reboots.
3. **Deployments & Probes (Backend/Frontend)**: We created Deployments to run your actual code. Crucially, we added **Liveness and Readiness Probes**. Kubernetes will constantly ping your /health endpoints. If your app crashes, Kubernetes will automatically restart it (Self-Healing).
4. **Autoscaling (HPA)**: We defined Horizontal Pod Autoscalers (HPA) for both the frontend and backend. If CPU usage spikes over 75%, Kubernetes will automatically spin up more pods.
5. **Ingress & SealedSecrets**: We wrote the Ingress rules to route http://localhost/api to your backend and everything else to your frontend. Finally, we installed the **Bitnami SealedSecrets** controller via Helm, which will let us safely encrypt and commit your .env variables to GitHub later.

### Phase 3: Observability (Metrics & Logs)

In this phase, we installed the full observability suite so you have complete visibility into your local cluster:

1. **Metrics Server**: We installed the Kubernetes Metrics Server. This is what allows your HorizontalPodAutoscaler (HPA) to read CPU and Memory metrics. Without this, your pods would never automatically scale up or down!
2. **Kube-Prometheus-Stack**: We used helm to install Prometheus (to scrape metrics from all your pods) and Grafana (to visualize those metrics in beautiful dashboards). Grafana was automatically bound to the grafana.localhost URL via Ingress.
3. **Loki & Promtail (PLG Stack)**: We also installed Loki (log aggregation system) and Promtail. Promtail runs on your cluster node and automatically intercepts every single console.log or Python print statement from your Backend and Frontend pods, shipping them securely to Loki. You can now search all logs centrally inside Grafana without ever needing to use kubectl logs!

### Phase 4: CI/CD & GitOps Pipeline

In this final phase, we automated the deployment process:

1. **GitHub Actions**: We created .github/workflows/ci-cd.yml. This pipeline tells GitHub to test your code, build the Docker images, push them to GHCR, and then automatically rewrite your k8s/backend.yaml and rontend.yaml to point to the new image tag. It then commits this change back to your repo.
2. **ArgoCD**: We installed ArgoCD directly into your cluster. ArgoCD is a GitOps controller. Its sole job is to watch your GitHub repository. The moment GitHub Actions pushes the new image tag to your k8s/ folder, ArgoCD instantly detects the change and updates your running Pods in the local cluster!

(Note: The GitOps loop relies on your code actually being in GitHub, so pushing your code is the trigger!)
