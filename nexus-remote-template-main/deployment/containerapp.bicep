// Two Container Apps for a NEXUS remote: <name>-ui and <name>-be.
// Deploy into an existing Container Apps environment.
//
//   az deployment group create -g <rg> -f deployment/containerapp.bicep \
//     -p appName=myapp \
//        environmentId=<managedEnvResourceId> \
//        acrLoginServer=<acr>.azurecr.io \
//        uiImage=<acr>.azurecr.io/myapp-ui:<tag> \
//        beImage=<acr>.azurecr.io/myapp-be:<tag>

@description('Base name; produces <appName>-ui and <appName>-be')
param appName string

@description('Resource ID of the existing Container Apps managed environment')
param environmentId string

@description('ACR login server, e.g. myacr.azurecr.io')
param acrLoginServer string

@description('Managed identity resource id with AcrPull on the registry')
param acrPullIdentityId string

param uiImage string
param beImage string

@description('AAD tenant id for backend token validation')
param tenantId string
@description('Backend API audience (App ID URI), e.g. api://<client-id>')
param apiAudience string
@description('Required scope on Token B')
param requiredScope string = 'access_as_user'

@description('R6 — CORS origin for the UI (remoteEntry.js). Set to the NEXUS HOST origin that embeds this remote, e.g. https://nexus.example.com. Defaults to "*" (dev-only) — override in production.')
param allowedOrigin string = '*'

param location string = resourceGroup().location

var registries = [
  {
    server: acrLoginServer
    identity: acrPullIdentityId
  }
]

resource ui 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${appName}-ui'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${acrPullIdentityId}': {} }
  }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        // CORS is handled by nginx in the container (needed for remoteEntry.js).
      }
      registries: registries
    }
    template: {
      containers: [
        {
          name: 'ui'
          image: uiImage
          resources: { cpu: json('0.5'), memory: '1Gi' }
          // R6 — nginx entrypoint envsubst reads ALLOWED_ORIGIN to scope CORS ACAO.
          // MUST be the NEXUS host origin in production, not a wildcard.
          env: [
            { name: 'ALLOWED_ORIGIN', value: allowedOrigin }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 3 }
    }
  }
}

resource be 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${appName}-be'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${acrPullIdentityId}': {} }
  }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
      }
      registries: registries
    }
    template: {
      containers: [
        {
          name: 'be'
          image: beImage
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'AAD_TENANT_ID', value: tenantId }
            { name: 'AAD_AUDIENCE', value: apiAudience }
            { name: 'AAD_REQUIRED_SCOPE', value: requiredScope }
            // Lock CORS to the UI origin once known:
            { name: 'ALLOWED_ORIGINS', value: 'https://${appName}-ui.${location}.azurecontainerapps.io' }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 3 }
    }
  }
}

output uiFqdn string = ui.properties.configuration.ingress.fqdn
output beFqdn string = be.properties.configuration.ingress.fqdn
