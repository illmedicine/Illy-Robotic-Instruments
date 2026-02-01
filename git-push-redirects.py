#!/usr/bin/env python3
"""
Git automation script to commit and push redirect changes
"""
import subprocess
import os
from pathlib import Path

workspace_root = Path(r"\\illmedicine-wb\Users\demar\Documents\GitHub\Illy-Robotic-Instruments")

repos = [
    (workspace_root / "LivePay", "LivePay"),
    (workspace_root / "Frontend", "Frontend (IllySocial)"),
]

def run_git_command(repo_path, command):
    """Run a git command in the specified repository"""
    try:
        result = subprocess.run(
            command,
            cwd=repo_path,
            shell=True,
            capture_output=True,
            text=True,
            check=True
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr

print("=" * 60)
print("📦 Git Commit & Push Automation")
print("=" * 60)
print()

for repo_path, repo_name in repos:
    print(f"Processing {repo_name}...")
    print("-" * 60)
    
    if not repo_path.exists():
        print(f"⚠️  Directory not found: {repo_path}")
        print()
        continue
    
    # Check git status
    success, output = run_git_command(repo_path, "git status --short")
    if success and output.strip():
        print(f"📋 Changes detected:")
        print(output)
        
        # Add files
        print(f"➕ Adding files...")
        success, output = run_git_command(repo_path, "git add index.html index.old*.html")
        if success:
            print(f"   ✅ Files staged")
        else:
            print(f"   ❌ Error staging files: {output}")
            print()
            continue
        
        # Commit
        print(f"💾 Committing changes...")
        commit_message = "Redirect to illyrobotic-ai.com unified domain"
        success, output = run_git_command(repo_path, f'git commit -m "{commit_message}"')
        if success:
            print(f"   ✅ Committed: {commit_message}")
        else:
            print(f"   ℹ️  {output.strip()}")
        
        # Push
        print(f"🚀 Pushing to remote...")
        success, output = run_git_command(repo_path, "git push")
        if success:
            print(f"   ✅ Successfully pushed to remote")
        else:
            print(f"   ⚠️  Push result: {output.strip()}")
    else:
        print(f"ℹ️  No changes detected or not a git repository")
    
    print()

print("=" * 60)
print("✅ Git operations complete!")
print("=" * 60)
print()
print("Verify your changes at:")
print("  • https://illmedicine.github.io/LivePay/")
print("  • https://illmedicine.github.io/illysocialV2/")
print()
print("They should now redirect to illyrobotic-ai.com!")
