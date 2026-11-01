# Infrastructure

Terraform for the Azure hosting. Two roots, both on
remote state in a storage account that allows Entra auth only.

| Root                  | Applied by               | Creates                                                                                                                                             |
| --------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `terraform/bootstrap` | the owner, locally, once | state storage, the application resource group, the deploy identity (`tecken-cd`) with two OIDC federated credentials and two roles scoped to the RG |
| `terraform/main`      | the owner, locally       | the registry (`teckenacr`), the app identity with `AcrPull`, the Container Apps environment and app (`tecken-app`), and the optional custom domain  |

No subscription, tenant or client ID is committed. State location is
passed at init:

```sh
terraform init -backend-config="resource_group_name=tecken-tfstate" \
    -backend-config="storage_account_name=teckentfstate"
```

The `production` GitHub environment holds the values the deploy workflow
reads, all as variables (none is secret under OIDC): `AZURE_CLIENT_ID`,
`AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `TECKEN_RESOURCE_GROUP`,
`TECKEN_CONTAINER_APP` and `TECKEN_REGISTRY`.

## Cost posture

The container app scales to zero (`min_replicas = 0`, Consumption plan),
so idle time costs nothing beyond the registry (Basic) and the state
storage. The first request after idle waits for a container start.

## Custom domain

Leave `public_hostname` empty until two DNS records exist:

- `CNAME tecken.demo` → the `app_fqdn` output (DNS only, no proxy)
- `TXT asuid.tecken.demo` → the `custom_domain_verification_id` output

Then apply with `-var public_hostname=tecken.demo.ludvigalden.com`. The
managed certificate issues once DNS validates, and an azapi update binds
it (`SniEnabled`); the azurerm resource alone cannot.
