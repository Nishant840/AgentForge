import os
import json
from apps.api.services.retrieval import search_codebase

# ── Tool Schemas (Structured definitions exposed to the LLM for function calling) ──
TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "search_code",
            "description": "Search the codebase semantically for code relevant to a query. Use this to find functions, classes, or logic related to the task.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Natural language search query"},
                    "repo_id": {"type": "string", "description": "The repository ID to search in"}
                },
                "required": ["query", "repo_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the full content of a specific file in the repository.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "Relative path to the file e.g. src/auth/login.py"},
                    "repo_local_path": {"type": "string", "description": "Absolute local path of the cloned repository"}
                },
                "required": ["file_path", "repo_local_path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Write content to a file in the repository. Use this to implement fixes or new features.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "Relative path to the file"},
                    "content": {"type": "string", "description": "Full new content of the file"},
                    "repo_local_path": {"type": "string", "description": "Absolute local path of the cloned repository"}
                },
                "required": ["file_path", "content", "repo_local_path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_directory",
            "description": "List all files and subdirectories in a directory of the repository.",
            "parameters": {
                "type": "object",
                "properties": {
                    "directory_path": {"type": "string", "description": "Relative path to directory, use '.' for root"},
                    "repo_local_path": {"type": "string", "description": "Absolute local path of the cloned repository"}
                },
                "required": ["directory_path", "repo_local_path"]
            }
        }
    },
    {
    "type": "function",
    "function": {
        "name": "run_command",
        "description": "Run a shell command in an isolated sandbox. Use this to run tests (pytest, npm test), check syntax (python -m py_compile), or install dependencies. The command runs inside a Docker container with no internet access.",
        "parameters": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The shell command to run e.g. 'pytest tests/ -v' or 'python -m py_compile src/main.py'"
                },
                "repo_local_path": {
                    "type": "string",
                    "description": "Absolute local path of the cloned repository"
                }
            },
            "required": ["command", "repo_local_path"]
        }
    }
}

]

# ── Tool Executors (Handlers that execute the requested tool actions) ──
async def execute_tool(tool_name: str, tool_args: dict) -> str:
    """Route tool execution requests from the LLM to the appropriate backend service or file operation."""
    if tool_name == "search_code":
        result = await search_codebase(
            query=tool_args["query"],
            repo_id=tool_args["repo_id"],
            top_k=8  # Return top 8 matching code chunks to maintain an optimal context window for the agent
        )
        return result.context_window

    elif tool_name == "read_file":
        full_path = os.path.join(
            tool_args["repo_local_path"],
            tool_args["file_path"]
        )
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                content = f.read()
            return f"File: {tool_args['file_path']}\n\n{content}"
        except FileNotFoundError:
            return f"ERROR: File not found: {tool_args['file_path']}"

    elif tool_name == "write_file":
        full_path = os.path.join(
            tool_args["repo_local_path"],
            tool_args["file_path"]
        )
        os.makedirs(os.path.dirname(full_path), exist_ok=True)  # Create parent directories automatically if missing
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(tool_args["content"])
        return f"SUCCESS: Written to {tool_args['file_path']}"

    elif tool_name == "list_directory":
        full_path = os.path.join(
            tool_args["repo_local_path"],
            tool_args["directory_path"]
        )
        try:
            items = os.listdir(full_path)
            return "\n".join(sorted(items))  # Return sorted directory contents as a clean newline-separated string
        except FileNotFoundError:
            return f"ERROR: Directory not found: {tool_args['directory_path']}"

    elif tool_name == "run_command":
        from apps.api.services.sandbox import run_in_sandbox           # Import here to avoid circular imports
        result = await run_in_sandbox(                                 # Run in Docker sandbox
            command=tool_args["command"],
            repo_local_path=tool_args["repo_local_path"]
        )
        # Format output nicely for the agent to read
        status = "✅ SUCCESS" if result["success"] else "❌ FAILED"
        timed = " (TIMED OUT)" if result["timed_out"] else ""
        return (
            f"Command: {tool_args['command']}\n"
            f"Status: {status}{timed}\n"
            f"Exit Code: {result['exit_code']}\n"
            f"Output:\n{result['stdout']}"                            # Agent reads this to know what happened
        )


    return f"ERROR: Unknown tool: {tool_name}"