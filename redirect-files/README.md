# Redirect Files Setup Instructions

## Overview
These redirect files will automatically forward traffic from your old GitHub Pages repos to your new unified domain at illyrobotic-ai.com.

## Files Created

### 1. LivePay Redirect
**File**: `livepay-index.html`
**Destination Repo**: illmedicine/LivePay
**Action**: Replace the existing `index.html` in your LivePay repo with this file

### 2. Illy Social Redirect  
**File**: `illysocial-index.html`
**Destination Repo**: illmedicine/illysocialV2
**Action**: Replace the existing `index.html` in your illysocialV2 repo with this file

### 3. DisCryptoBank Redirect
**File**: `discryptobank-index.html`
**Destination Repo**: illmedicine/DisCryptoBankWebSite
**Action**: Replace the existing `index.html` in your DisCryptoBankWebSite repo with this file

## Deployment Steps

1. **Backup Original Files** (Optional but Recommended)
   ```bash
   # In each repo, rename the current index.html
   git mv index.html index.old.html
   ```

2. **Copy Redirect Files**
   - Copy the appropriate redirect file to each repo
   - Rename it to `index.html`

3. **Commit and Push**
   ```bash
   git add index.html
   git commit -m "Redirect to unified illyrobotic-ai.com domain"
   git push origin main
   ```

4. **Verify**
   - Visit each old URL to confirm redirection works:
     - https://illmedicine.github.io/LivePay/
     - https://illmedicine.github.io/illysocialV2/
     - https://illmedicine.github.io/DisCryptoBankWebSite/

## Expected Behavior

All three URLs will automatically redirect to:
- LivePay → https://illyrobotic-ai.com/products/livepay
- IllySocial → https://illyrobotic-ai.com/products/illy-social
- DisCryptoBank → https://illyrobotic-ai.com/products/discryptobank

The redirect happens in three ways for maximum compatibility:
1. HTML meta refresh (instant)
2. JavaScript redirect (fallback)
3. Manual link (if both fail)
