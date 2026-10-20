import docker
import uuid
from apps.api.core.config import settings

# Initialize the Docker client using local environment/daemon configuration
docker_client = docker.from_env()

SANDBOX_IMAGE = "python:3.11-slim"  # Lightweight base image for running Python-based repositories safely
MAX_EXECUTION_TIME = 60  # Maximum execution timeout in seconds to prevent infinite loops or hanging tasks
MAX_OUTPUT_SIZE = 10000  # Character length threshold to truncate container output and prevent memory exhaustion

async def run_in_sandbox(command: str, repo_local_path: str) -> dict:
    """Execute a shell command inside an isolated, resource-constrained Docker container sandbox."""
    container_name = f"agentforge-sandbox-{uuid.uuid4().hex[:8]}"

    try:
        container = docker_client.containers.run(
            image=SANDBOX_IMAGE,
            command=f"bash -c '{command}'",  # Wrap in bash to support piping, chaining, and shell redirects
            name=container_name,
            volumes={
                repo_local_path: {
                    "bind": "/workspace",  # Mount the target repository directory inside the container
                    "mode": "rw"  # Read-write access so the autonomous agent can implement and test changes
                }
            },
            working_dir="/workspace",
            mem_limit="512m",  # Restrict memory usage to 512MB max
            cpu_period=100000,
            cpu_quota=50000,  # Limit CPU usage to 50% of a single core
            network_mode="none",  # Completely isolate the container by disabling external network access
            remove=False,  # Retain container until manually cleaned up in the finally block
            detach=True  # Run in background mode to allow timeout control via container.wait()
        )

        try:
            result = container.wait(timeout=MAX_EXECUTION_TIME)
            timed_out = False
            exit_code = result["StatusCode"]  # 0 indicates successful execution; non-zero represents an error
        except Exception:
            container.kill()  # Forcefully terminate the container if execution exceeds the timeout limit
            timed_out = True
            exit_code = -1

        # Capture and decode combined stdout and stderr logs from the container
        logs = container.logs(stdout=True, stderr=True)
        output = logs.decode("utf-8", errors="replace")
        output = output[:MAX_OUTPUT_SIZE]  # Truncate output if it exceeds the maximum size limit

        return {
            "stdout": output,
            "stderr": "",
            "exit_code": exit_code,
            "timed_out": timed_out,
            "success": exit_code == 0 and not timed_out
        }

    except docker.errors.ImageNotFound:
        return {
            "stdout": "",
            "stderr": f"Docker image '{SANDBOX_IMAGE}' not found. Run: docker pull {SANDBOX_IMAGE}",
            "exit_code": -1, "timed_out": False, "success": False
        }

    except Exception as e:
        return {
            "stdout": "",
            "stderr": f"Sandbox error: {str(e)}",
            "exit_code": -1, "timed_out": False, "success": False
        }

    finally:
        try:
            container.remove(force=True)  # Ensure the container is always forcefully removed after completion
        except Exception:
            pass