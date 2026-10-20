# Deploy with your facilitator — day two

Nothing here deploys automatically. The app needs no Azure access on day one.

## Prepare once

The facilitator provides an existing Container App, Azure Container Registry, subscription ID, and resource group. Configure the app's HTTP ingress to target **8000** and its registry pull identity/permissions before running the script. Ensure the active Cloud Shell account can build images in the registry and update this app. Check the intended subscription and destination carefully; this updates that app's image.

The Dockerfile builds React and serves it through FastAPI in one container. There is no database and no sign-in. Use fictional information and the intended demo network access settings.

## Make a source ZIP on Windows

In VS Code's PowerShell terminal at the repository root:

```powershell
.\scripts\package.ps1
```

If organizational policy blocks scripts, ask the facilitator to help; do not bypass policy. The ZIP includes `frontend`, `backend`, `deployment`, and `.dockerignore`, excluding dependencies, virtual environments, local environment files, and reference media. Inspect the ZIP before upload if your team added other sensitive files.

## Upload and deploy in Cloud Shell (Bash)

Upload `hackathon-source.zip` with Cloud Shell's upload control. Use a fresh extraction folder for each deployment so removed files do not remain from a previous upload.

```bash
mkdir "hackathon-$(date +%s)"
# Replace FRESH_FOLDER below with the folder you just created.
unzip hackathon-source.zip -d FRESH_FOLDER
cd FRESH_FOLDER
export AZURE_SUBSCRIPTION='YOUR-SUBSCRIPTION-ID'
export RESOURCE_GROUP='YOUR-RESOURCE-GROUP'
export CONTAINER_APP='YOUR-EXISTING-APP'
export REGISTRY='YOUR-REGISTRY-RESOURCE-NAME'
bash deployment/deploy.sh
```

`REGISTRY` is the resource name, not the `.azurecr.io` hostname. The script reads the login server, builds remotely with ACR, tags the image uniquely, and updates the existing Container App. It does not enable registry admin credentials or change ingress.

Check the new revision is healthy, then open the app URL and verify the PFE Dashboard loads. If your app uses multiple revision mode, inspect traffic settings and route traffic to the intended revision through your normal Azure process. An image update does not guarantee traffic has moved.

If the image cannot be pulled, check the Container App's registry identity/permissions. If the revision never becomes healthy, check target port 8000 and revision logs. ACR build requires registry build permissions and access to the base-image/package registries.

PFE demo data remains browser-local after deployment. It does not move from localhost to the Azure address, and simulated submissions do not notify a manager.

CLI reference: [ACR builds](https://learn.microsoft.com/en-us/cli/azure/acr#az-acr-build) and [Container App updates](https://learn.microsoft.com/en-us/cli/azure/containerapp#az-containerapp-update).
