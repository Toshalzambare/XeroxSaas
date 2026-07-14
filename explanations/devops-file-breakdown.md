# Detailed DevOps File Breakdown

This document provides a deep, line-by-line explanation of every crucial configuration file in the repository (excluding Windows Batch scripts), explaining what each section does and how it affects the infrastructure.

---

## 1. `docker-compose.yml`
**Purpose:** Defines and runs the lightweight local development environment. It spins up the databases, backend, and frontend in isolated containers on a single virtual Docker network.

### Line-by-Line Breakdown:
- **`services:`**: The root block defining every container that will run in this network.
- **`mongo:`** (and `redis:`, `minio:`, `backend:`, `frontend:`): The names of the individual services. Docker will map these names to DNS so containers can talk to each other (e.g., the backend can connect to MongoDB using the URL `mongodb://mongo:27017`).
- **`image: mongo:6.0`**: Pulls the official MongoDB image version 6.0 from Docker Hub.
- **`restart: always`**: If the container crashes or the Docker daemon restarts, Docker will automatically attempt to restart this container.
- **`environment:`**: Injects environment variables directly into the container. For example, `MONGO_INITDB_ROOT_USERNAME: ${MONGO_INITDB_ROOT_USERNAME}` passes the value from your `.env` file securely into the database to set up the admin user on first boot.
- **`ports: - "${MONGO_PORT}:27017"`**: The critical bridge between your laptop and the container. `27017` is the port MongoDB uses *inside* the isolated container. `${MONGO_PORT}` is the physical port on your actual laptop. This mapping allows you to connect a local GUI tool (like MongoDB Compass) to `localhost:27017`.
- **`volumes: - mongo_data:/data/db`**: Persists the database data to your local hard drive. The left side (`mongo_data`) is a named volume managed by Docker, and the right side (`/data/db`) is where MongoDB naturally saves its data inside the Linux container. Without this, all data is permanently lost the moment the container stops.
- **`healthcheck:`**:
  - `test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet`: Periodically runs a real MongoDB ping command inside the container to ensure it is actually accepting connections, not just "running".
  - `interval: 10s`, `timeout: 5s`, `retries: 5`: Tells Docker to check every 10 seconds. If it fails 5 times, mark the container as "unhealthy".
- **`depends_on: mongo: condition: service_healthy`**: (Found in the `backend` block). This ensures the `backend` container absolutely will not start until the `mongo` container passes its health check. This prevents the Node.js app from crashing due to a missing database connection on boot.
- **`build: context: ./backend, dockerfile: Dockerfile`**: Instead of pulling a pre-built image from the internet, this instructs Docker to look inside the `./backend` folder, read the `Dockerfile`, and compile the image locally from your raw source code.

---

## 2. `kind-config.yaml`
**Purpose:** Configures the local KinD (Kubernetes IN Docker) cluster *before* it is created.

### Line-by-Line Breakdown:
- **`kind: Cluster`, `apiVersion: kind.x-k8s.io/v1alpha4`**: Defines this YAML as a KinD specific configuration file.
- **`nodes: - role: control-plane`**: Tells KinD to spin up a single Docker container that acts as both the Master (Control Plane) and the Worker Node.
- **`kubeadmConfigPatches:`**:
  - **`node-labels: "ingress-ready=true"`**: Injects a custom tag/label into the Kubernetes node during its creation. The NGINX Ingress Controller is programmed to only attach itself to nodes with this exact label.
- **`extraPortMappings:`**:
  - **`containerPort: 80, hostPort: 80`**: This is crucial for local access. It maps your laptop's physical port `80` (HTTP) directly through the Docker boundary into the Kubernetes node's internal port `80`. This is the literal bridge that allows you to type `localhost` in your browser and reach the cluster.

---

## 3. Kubernetes Application Manifests (`k8s/`)
These files represent the true "GitOps" state of your application.

### `k8s/namespace.yaml`
- **`kind: Namespace`, `name: xerox`**: Creates a virtual boundary inside Kubernetes. All our apps live inside the `xerox` namespace so they don't accidentally interfere with system tools like ArgoCD or Ingress controllers.

### `k8s/mongodb.yaml`, `k8s/redis.yaml`, `k8s/minio.yaml`
These files deploy your databases. They use `StatefulSets` instead of `Deployments` because databases need permanent storage.
- **`kind: StatefulSet`**: Ensures that pods are created in strict order and attached to permanent disks. If a database pod crashes, Kubernetes guarantees the replacement pod will be attached to the exact same disk.
- **`resources: limits: memory: 1Gi, cpu: 1`**: A hard ceiling. If MongoDB tries to use more than 1GB of RAM, Kubernetes will forcefully kill it (OOMKilled) to protect the rest of the node.
- **`resources: requests: memory: 512Mi, cpu: 500m`**: What the container *needs* to run. Kubernetes uses this to calculate where to place the pod.
- **`volumeMounts: - name: mongo-data, mountPath: /data/db`**: Mounts the persistent disk to the folder where the DB saves data.
- **`volumeClaimTemplates:`**: Automatically provisions a virtual hard drive (`storage: 2Gi`) from the cluster for the database to use.
- **`kind: Service`**: Acts as a permanent internal load balancer. Pod IP addresses change every time they crash, but the Service name (`mongodb`) never changes. Other pods connect using `mongodb.xerox.svc.cluster.local`.

### `k8s/backend.yaml` & `k8s/frontend.yaml`
These deploy your stateless microservices.
- **`kind: Deployment`**: Manages spinning up pods and handles Zero-Downtime Rolling Updates when new code is pushed.
- **`imagePullSecrets: - name: ghcr-login-secret`**: Tells Kubernetes how to log into GitHub Container Registry to download your private Docker images.
- **`image: ghcr.io/.../anti-print-backend:sha-6030266`**: The exact version of your code to run. **This is the exact line the GitHub Actions CI pipeline modifies.**
- **`envFrom: - configMapRef: name: backend-config`**: Injects non-sensitive environment variables (like `PORT` and `MONGO_URI`) into the container.
- **`secretRef: name: jwt-secret`**: Injects sensitive passwords securely.
- **`livenessProbe: httpGet: path: /`**: Kubernetes pings `/` every 10 seconds. If your backend freezes and doesn't respond with a 200 OK, Kubernetes automatically shoots the pod in the head and restarts it.
- **`readinessProbe:`**: Kubernetes pings this to see if the app is finished booting up. If it fails, Kubernetes stops sending user traffic to this pod until it recovers.
- **`kind: HorizontalPodAutoscaler`**: If the `backend` uses more than 75% of its CPU limit, Kubernetes will automatically spin up identical clone pods (up to 5) to handle the load, and delete them when the traffic drops.

### `k8s/ingress.yaml`
- **`kind: Ingress`**: The cluster's router. It catches web traffic hitting `localhost`.
- **`ingressClassName: nginx`**: Binds these rules to the NGINX controller.
- **`- path: /api, backend: service: name: backend`**: If the URL starts with `/api`, forward the traffic to the internal Kubernetes Service named `backend` on port `5000`.
- **`- path: /, backend: service: name: frontend`**: The catch-all route. Anything that *isn't* `/api` falls through to this rule, forwarding traffic to the React `frontend` Service on port `80`.

### `k8s/argocd-app.yaml`
- **`kind: Application`**: An ArgoCD-specific Custom Resource Definition (CRD).
- **`repoURL: 'https://github.com/Toshalzambare/Anti-print.git'`**: The Git repository ArgoCD continuously polls.
- **`targetRevision: local-devops`**: The specific Git branch it watches.
- **`path: k8s`**: Tells ArgoCD to strictly apply YAML files found in the `k8s/` folder.
- **`destination: server: 'https://kubernetes.default.svc'`**: Deploys the application directly into the cluster it is currently running in.
- **`syncPolicy: automated: prune: true, selfHeal: true`**: `prune` means if you delete `redis.yaml` from Git, ArgoCD will permanently delete Redis from the cluster. `selfHeal` means if someone manually edits the cluster using `kubectl`, ArgoCD instantly reverts it to match Git.

---

## 4. `.github/workflows/ci-cd.yml`
**Purpose:** The GitHub Actions pipeline that automates testing, building, and deploying code.

### Line-by-Line Breakdown:
- **`on: push: branches: - main - local-devops`**: Triggers this workflow automatically whenever code is pushed to these branches.
- **`permissions: contents: write, packages: write`**: Gives the CI bot permission to push Docker images to the GitHub Container Registry (`ghcr.io`) and commit modified files back to the repository.
- **`uses: docker/build-push-action@v5`**: An official action that reads the local `Dockerfile`, compiles the application, and uploads it to `ghcr.io`.
- **`TAG=sha-${GITHUB_SHA::7}`**: Extracts the first 7 characters of the Git commit hash to use as a unique Docker image version tag.
- **`sed -i "s|image: ghcr.io...|image: ...:${TAG}|" k8s/backend.yaml`**: The magic GitOps line. It uses Linux `sed` (Stream Editor) to search `backend.yaml` for the old Docker image tag and dynamically replace it with the new `$TAG`.
- **`git commit -m "ci: update image tags"`**: The CI bot commits the modified `backend.yaml` back to GitHub.
- **GitOps Loop Closure**: Once that commit lands in GitHub, ArgoCD detects the change 3 minutes later and pulls the new image into the Kubernetes cluster.

---

## 5. Observability Integration: Prometheus, Grafana, and Loki

While not natively committed as raw YAMLs in the `k8s/` folder, adding Prometheus, Grafana, and Loki to a Kubernetes cluster is the industry standard for Observability. Here is exactly how they are connected and utilized.

### How They Are Installed
They are typically installed using **Helm**, the Kubernetes package manager, rather than writing raw YAMLs from scratch.
```bash
# 1. Install Prometheus & Grafana (The Kube-Prometheus-Stack)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n observability --create-namespace

# 2. Install Loki & Promtail (The Loki Stack)
helm repo add grafana https://grafana.github.io/helm-charts
helm install loki grafana/loki-stack -n observability
```

### How They Connect and Work

#### 1. Prometheus (Metrics Collection)
- **The Connection:** Prometheus operates on a **Pull Model**. It doesn't wait for your app to send data. Instead, you create a Kubernetes object called a `ServiceMonitor`.
- **How it works:** The `ServiceMonitor` tells Prometheus: "Look for any Pod with the label `app: backend`, connect to it on port `5000` at the `/metrics` path every 15 seconds."
- Prometheus aggressively scrapes this data (CPU usage, memory, HTTP request rates, error codes) and stores it in its internal Time-Series Database.

#### 2. Loki & Promtail (Log Aggregation)
- **The Connection:** Loki operates on a **Push Model** using an agent called **Promtail**.
- **How it works:** When you install the Loki stack, it deploys Promtail as a `DaemonSet` (meaning exactly one instance of Promtail runs on every single physical Kubernetes Node). 
- Promtail automatically taps into the underlying Docker log files on the host machine. It reads the console outputs (stdout/stderr) of *every single pod*, attaches metadata tags to them (e.g., `namespace=xerox`, `pod=backend-5f6x8`), and pushes them over the internal network to the central Loki database.

#### 3. Grafana (The Visualization Hub)
- **The Connection:** Grafana acts as the unified frontend. It does not store data itself.
- **How it works:** You configure Grafana with "Data Sources" pointing to the internal Kubernetes DNS addresses of Prometheus and Loki:
  - `http://prometheus-operated.observability.svc.cluster.local:9090`
  - `http://loki.observability.svc.cluster.local:3100`
- A DevOps engineer writes PromQL (Prometheus Query Language) and LogQL (Loki Query Language) queries in Grafana to create dashboards. 
- **The Result:** You can look at a single Grafana dashboard and see a line graph of your backend CPU spiking (pulled from Prometheus), and directly below it, a live stream of the exact error logs the backend threw during that spike (pulled from Loki).
