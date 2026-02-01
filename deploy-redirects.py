import os
import shutil
from pathlib import Path

# Get the workspace root
workspace_root = Path(r"\\illmedicine-wb\Users\demar\Documents\GitHub\Illy-Robotic-Instruments")
redirect_files_dir = workspace_root / "redirect-files"

# Define the mappings: (source_redirect_file, target_directory, repo_name)
redirects = [
    ("livepay-index.html", workspace_root / "LivePay", "LivePay"),
    ("illysocial-index.html", workspace_root / "Frontend", "IllySocial (Frontend)"),
]

print("=" * 60)
print("🚀 Automated Redirect File Deployment")
print("=" * 60)
print()

for redirect_file, target_dir, repo_name in redirects:
    print(f"Processing {repo_name}...")
    print("-" * 60)
    
    # Check if target directory exists
    if not target_dir.exists():
        print(f"⚠️  Warning: {target_dir} does not exist. Skipping.")
        print()
        continue
    
    # Paths
    source_file = redirect_files_dir / redirect_file
    target_index = target_dir / "index.html"
    backup_index = target_dir / "index.old.html"
    
    # Check if source redirect file exists
    if not source_file.exists():
        print(f"❌ Error: {source_file} not found. Skipping.")
        print()
        continue
    
    # Backup existing index.html if it exists
    if target_index.exists():
        # If backup already exists, create a numbered backup
        if backup_index.exists():
            counter = 1
            while (target_dir / f"index.old.{counter}.html").exists():
                counter += 1
            backup_index = target_dir / f"index.old.{counter}.html"
        
        print(f"📦 Backing up existing index.html...")
        shutil.copy2(target_index, backup_index)
        print(f"   ✅ Backup saved to: {backup_index.name}")
    else:
        print(f"ℹ️  No existing index.html found (new file will be created)")
    
    # Copy redirect file to index.html
    print(f"📄 Deploying redirect file...")
    shutil.copy2(source_file, target_index)
    print(f"   ✅ {redirect_file} → index.html")
    
    print(f"✅ Successfully deployed redirect for {repo_name}")
    print()

print("=" * 60)
print("🎉 Deployment Complete!")
print("=" * 60)
print()
print("Next Steps:")
print("1. Review the changes in each directory")
print("2. Navigate to each repo directory and run:")
print("   git add index.html index.old*.html")
print("   git commit -m 'Redirect to illyrobotic-ai.com unified domain'")
print("   git push")
print()
print("📍 Redirect URLs:")
print("   • LivePay → https://illyrobotic-ai.com/products/livepay")
print("   • Illy Social → https://illyrobotic-ai.com/products/illy-social")
print("   • Discryptobank → https://illyrobotic-ai.com/products/discryptobank")
print()
print("Note: DisCryptoBank redirect file is ready in redirect-files/")
print("      Copy it manually to your DisCryptoBankWebSite repo")
