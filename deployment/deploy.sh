#!/usr/bin/env bash
# Run from the repository root in Azure Cloud Shell (Bash).
set -euo pipefail
cd "$(dirname "$0")/.."
: "${AZURE_SUBSCRIPTION:?Set AZURE_SUBSCRIPTION to your subscription ID}"
: "${RESOURCE_GROUP:?Set RESOURCE_GROUP}"
: "${CONTAINER_APP:?Set CONTAINER_APP to an existing app name}"
: "${REGISTRY:?Set REGISTRY to the registry resource name, without .azurecr.io}"
command -v az >/dev/null || { echo 'Run this in Azure Cloud Shell (Bash).'; exit 1; }
az account set --subscription "$AZURE_SUBSCRIPTION"
az containerapp show --resource-group "$RESOURCE_GROUP" --name "$CONTAINER_APP" --output none
LOGIN_SERVER=$(az acr show --name "$REGISTRY" --query loginServer --output tsv)
IMAGE="$LOGIN_SERVER/hackathon-starter:$(date -u +%Y%m%d%H%M%S)-$RANDOM"
echo "Building $IMAGE for $CONTAINER_APP in $RESOURCE_GROUP"
az acr build --registry "$REGISTRY" --image "$IMAGE" --file deployment/Dockerfile .
az containerapp update --resource-group "$RESOURCE_GROUP" --name "$CONTAINER_APP" --image "$IMAGE" --output none
echo 'Image update submitted. Confirm the revision is healthy before sharing the URL.'
az containerapp show --resource-group "$RESOURCE_GROUP" --name "$CONTAINER_APP" --query '{url:properties.configuration.ingress.fqdn,latestRevision:properties.latestRevisionName}' --output table
