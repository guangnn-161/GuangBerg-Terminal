---
name: harness
description: >-
  Comprehensive guide and runbook for Harness Open Source (github.com/harness/harness)
  and Harness CI/CD. Use when designing, creating, validating, or troubleshooting Harness pipelines,
  configuring CI/CD workflows, self-hosting Harness via Docker/Compose, integrating with Git/GitHub,
  managing Gitspaces, and automating builds, tests, and deployments.
---

# Harness Open Source & CI/CD Platform Guide

Harness Open Source (`github.com/harness/harness`, formerly Gitness) is an open-source, all-in-one developer platform providing source code management, code reviews, container-native CI/CD pipelines, Gitspaces, and artifact management.

---

## 1. Quick Reference: Core Concepts

| Concept | Description |
| :--- | :--- |
| **Pipeline** | Defines the end-to-end automated process composed of stages, steps, and triggers. |
| **Stage** | A logical boundary within a pipeline (e.g., CI build stage, CD deploy stage) running on a specific execution runtime. |
| **Step** | An atomic action executed inside an isolated container (e.g., `Run`, `Plugin`, `Action`, `Background`). |
| **Trigger** | Webhook or event rule (e.g., `push`, `pull_request`, `tag`, `cron`) initiating pipeline runs. |
| **Connector** | Credentials and connection endpoints to external services (GitHub, Docker Registry, Kubernetes, Cloud). |
| **Secrets** | Encrypted environment variables and credentials injected securely into pipeline steps. |
| **Gitspaces** | On-demand containerized cloud development environments. |

---

## 2. Pipeline Specification (`.harness/pipeline.yaml`)

Harness pipelines are defined in YAML. Below is a production-ready example for continuous integration, linting, testing, and Docker image publishing:

```yaml
version: 1
pipeline:
  name: build-and-test
  identifier: build_and_test
  stages:
    - name: test-and-build
      identifier: test_and_build
      type: ci
      spec:
        clone:
          depth: 50
        execution:
          steps:
            # 1. Environment & Dependency Setup
            - name: setup-and-lint
              identifier: setup_lint
              type: run
              spec:
                image: python:3.11-slim
                command: |
                  python -m pip install --upgrade pip
                  pip install flake8 pytest
                  flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics

            # 2. Automated Unit Tests
            - name: run-unit-tests
              identifier: run_tests
              type: run
              spec:
                image: python:3.11-slim
                env:
                  ENV: test
                command: |
                  pip install -r requirements.txt
                  pytest tests/ -v --junitxml=reports/test-results.xml
                reports:
                  type: junit
                  path: reports/test-results.xml

            # 3. Build & Push Docker Image (Optional plugin step)
            - name: build-docker-image
              identifier: docker_build
              type: plugin
              spec:
                name: docker
                settings:
                  repo: <registry>/<repository>
                  tags: latest,${DRONE_COMMIT_SHA:0:8}
                  username:
                    from_secret: docker_username
                  password:
                    from_secret: docker_password

  triggers:
    - name: on-push-main
      identifier: on_push_main
      type: webhook
      spec:
        event:
          - push
        branches:
          include:
            - main
```

---

## 3. Step Types Reference

### `Run` Step (Custom Script in Container)
Runs commands inside any Docker image:
```yaml
- name: compile-go
  type: run
  spec:
    image: golang:1.22
    command: |
      go mod download
      go build -o bin/app main.go
```

### `Background` Step (Service Containers)
Runs databases or message brokers alongside test steps (e.g., PostgreSQL, Redis):
```yaml
- name: redis-service
  type: background
  spec:
    image: redis:7-alpine
    port: 6379
```

### `Plugin` Step (Ecosystem Extensions)
Uses community/official Drone & Harness plugins (Slack notifications, S3 upload, Docker push):
```yaml
- name: slack-notify
  type: plugin
  spec:
    name: slack
    settings:
      webhook:
        from_secret: slack_webhook
      template: "Build {{ build.number }} finished with status {{ build.status }}"
```

---

## 4. Self-Hosting Harness Open Source

### Running with Docker (Single Node)
To run Harness locally or on a VPS:

```bash
docker run -d \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /tmp/harness-data:/data \
  --name harness \
  --restart always \
  harness/harness
```

Web UI will be available at: `http://localhost:3000`.

### Running with Docker Compose
```yaml
version: '3.8'

services:
  harness:
    image: harness/harness:latest
    container_name: harness
    restart: always
    ports:
      - "3000:3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - harness_data:/data
    environment:
      - GITNESS_USER_SIGNUP_ENABLED=true
      - GITNESS_ENCRYPTION_SECRET=your-secure-random-key-here

volumes:
  harness_data:
```

---

## 5. Integrating Harness with GitHub

1. **Connect GitHub SCM**:
   - In Harness UI &rarr; **Connectors** &rarr; **New Connector** &rarr; **GitHub**.
   - Authenticate via Personal Access Token (PAT) or GitHub App.
2. **Setup Webhook**:
   - In your GitHub repository: **Settings** &rarr; **Webhooks** &rarr; Add Harness webhook URL to trigger automated pipeline execution on `push` or `pull_request`.
3. **Status Checks**:
   - Harness automatically posts commit statuses back to GitHub Pull Requests (passing/failing checks).

---

## 6. Troubleshooting & Best Practices

- **Docker Socket Access**: If pipelines fail with `cannot connect to Docker daemon`, ensure the Harness runner container has `/var/run/docker.sock` mounted and proper socket permissions (`chmod 666 /var/run/docker.sock`).
- **Resource Limits**: Set CPU and memory limits on heavy build steps to avoid OOM kills on shared runner nodes.
- **Caching**: Use volume caching or artifact registries to avoid re-downloading dependencies on every run.
- **Secrets Management**: Never commit plaintext API keys or passwords. Reference secrets with `from_secret: <secret_name>`.
