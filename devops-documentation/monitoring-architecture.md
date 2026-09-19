# 📊 Monitoring Architecture (Prometheus, Grafana, & Loki)

This document explains the "Observability Stack" we built for XeroxSaaS. You wanted to know how Grafana magically appeared with dozens of dashboards, how Prometheus works, and how Loki collects logs. 

We used the industry-standard **PLG Stack** (Prometheus, Loki, Grafana) via **Helm**.

---

## 1. How did we get so many Grafana dashboards automatically?

We did not install Grafana manually. We used **Helm** (the package manager for Kubernetes) to install a massive bundle called the **`kube-prometheus-stack`**. 

When you run the Helm install command for this stack, it doesn't just install empty software; it installs:
1. Grafana
2. Prometheus
3. Alertmanager
4. **Dozens of pre-configured Dashboards** (as Kubernetes ConfigMaps)

Kubernetes automatically injects these pre-built dashboards (like the *Compute Resources / Cluster* one) directly into Grafana's database. Because you are using Kubernetes, the open-source community has already built the perfect dashboards for it, and Helm simply hands them to you for free!

---

## 2. How Prometheus Works (Metrics)

Prometheus is the time-series database that powers the numbers, graphs, and CPU/RAM charts you see in Grafana.

**How it works (The Pull Model):**
Unlike older systems where your application has to actively *push* data to a monitoring server, Prometheus uses a **Pull Model**. 
1. Prometheus maintains a directory of every single Pod running in your cluster.
2. Every 15 seconds, Prometheus reaches out (scrapes) a special `/metrics` endpoint on your Nodes and Pods.
3. It asks: *"How much CPU are you using right now? How much RAM?"*
4. It stores this data in a highly compressed database.
5. When you open Grafana, Grafana simply sends a mathematical query (using a language called PromQL) to Prometheus to draw the charts.

---

## 3. How Loki Works (Logs)

While Prometheus handles *numbers* (metrics), **Loki** handles *text* (logs). Loki is designed specifically to be highly efficient by not indexing the entire log text, but only indexing the Kubernetes labels (like `app=backend`, `namespace=xerox`).

**How it works (Promtail):**
1. We installed a tiny agent called **Promtail** as a `DaemonSet` in Kubernetes. This means exactly one Promtail container runs on every physical node (computer) in your cluster.
2. Whenever your Node.js app runs `console.log("Error processing order")`, Kubernetes writes that text to a hidden `.log` file deep in the host computer's hard drive.
3. Promtail constantly reads those hidden files in real-time.
4. It tags the text with labels (e.g., "This came from the backend pod in the xerox namespace").
5. It ships the logs to the centralized **Loki** database.
6. You use Grafana's "Explore" tab (using LogQL) to ask Loki to show you logs matching those specific labels.

---

## 4. The Exact Commands Used to Set This Up

If you ever need to rebuild this exact monitoring stack from scratch on a new cluster, here are the exact Helm commands we used:

### Step 1: Install Prometheus & Grafana (The Stack)
```powershell
# Add the Prometheus community repository to Helm
.\.bin\helm.exe repo add prometheus-community https://prometheus-community.github.io/helm-charts
.\.bin\helm.exe repo update

# Install the massive bundle into the 'monitoring' namespace
.\.bin\helm.exe install monitoring prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

### Step 2: Install Loki (The Log Database)
```powershell
# Add the Grafana repository to Helm
.\.bin\helm.exe repo add grafana https://grafana.github.io/helm-charts
.\.bin\helm.exe repo update

# Install Loki
.\.bin\helm.exe install loki grafana/loki -n monitoring
```

### Step 3: Install Promtail (The Log Shipper)
```powershell
# Install Promtail and tell it to send logs to the Loki server we just built
.\.bin\helm.exe install promtail grafana/promtail -n monitoring --set "config.clients[0].url=http://loki:3100/loki/api/v1/push"
```
