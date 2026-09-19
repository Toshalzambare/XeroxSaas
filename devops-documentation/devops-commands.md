# DevOps Command Cheat Sheet

This is a comprehensive reference of every tool and command used in the XeroxSaaS DevOps setup.

## 1. Kind (Kubernetes IN Docker)
`kind` is the tool that spins up the simulated Kubernetes environment on your laptop.

- **`.\.bin\kind.exe create cluster --config kind-config.yaml`**
  Spins up the Docker containers that act as your Kubernetes cluster, applying the specific configuration needed to allow Ingress (port 80/443).
- **`.\.bin\kind.exe get clusters`**
  Lists all active kind clusters running on your machine.
- **`.\.bin\kind.exe delete cluster`**
  Destroys the cluster. This completely deletes the underlying Docker containers, leaving a clean slate.

## 2. Kubectl (Kubernetes CLI)
`kubectl` is the remote control you use to talk to the cluster and manage your applications.

- **`.\.bin\kubectl.exe get pods -A`**
  Lists all running containers (pods) across every namespace in your entire cluster.
- **`.\.bin\kubectl.exe get svc -n xerox`**
  Lists all the Services (networking rules routing traffic between pods) specifically in the `xerox` namespace.
- **`.\.bin\kubectl.exe get ingress -n xerox`**
  Shows your Ingress controllers to verify that your app is listening for traffic on `localhost`.
- **`.\.bin\kubectl.exe logs <pod-name> -n xerox`**
  Prints the raw console logs of a specific pod. (Though you can use Loki in Grafana instead!)
- **`.\.bin\kubectl.exe delete pod <pod-name> -n xerox`**
  Forces Kubernetes to kill a pod. (This is a great way to test Self-Healing, as Kubernetes will instantly recreate it).

## 3. Helm (Kubernetes Package Manager)
`helm` is used to install massive, complex third-party applications (like Prometheus or ArgoCD) with a single command instead of writing thousands of lines of YAML manually.

- **`.\.bin\helm.exe repo add <name> <url>`**
  Adds a remote registry (like the Bitnami or Grafana repository) to your local Helm index.
- **`.\.bin\helm.exe repo update`**
  Pulls the latest versions of charts from your added repositories.
- **`.\.bin\helm.exe install <name> <chart> -n <namespace>`**
  Installs the specified application (e.g., Prometheus) into your Kubernetes cluster.

## 4. Git & GitHub Actions (CI/CD)
The tools used to trigger the automated CI/CD loop.

- **`git add . && git commit -m "msg" && git push`**
  The standard Git workflow. In our setup, pushing to the `local-devops` branch automatically triggers the GitHub Actions pipeline defined in `.github/workflows/ci-cd.yml`.
- **`git rm -r --cached <folder>`**
  Removes a folder from Git's tracking without deleting the actual files from your hard drive. (Used to fix our `.bin` large file issue).
