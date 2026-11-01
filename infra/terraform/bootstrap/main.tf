# One-time bootstrap, applied locally by the repository owner: the Terraform
# state store, the application resource group, and the deploy identity that
# GitHub Actions assumes over OpenID Connect. No client secret exists.

terraform {
  required_version = ">= 1.9"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.7"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.10"
    }
    azapi = {
      source  = "Azure/azapi"
      version = "~> 2.13"
    }
  }

  # The state resource group and account are passed with -backend-config, so
  # no subscription detail lives in the repository. The first apply runs on
  # local state and is then migrated here (terraform init -migrate-state).
  backend "azurerm" {
    use_azuread_auth = true
    container_name   = "tfstate"
    key              = "bootstrap.tfstate"
  }
}

provider "azurerm" {
  features {}

  resource_providers_to_register = [
    "Microsoft.App",
    "Microsoft.ContainerRegistry",
    "Microsoft.ManagedIdentity",
    "Microsoft.Storage",
  ]
}

locals {
  location      = "swedencentral"
  state_account = "${replace(var.prefix, "-", "")}tfstate"
  oidc_issuer   = "https://token.actions.githubusercontent.com"
}

data "azuread_client_config" "current" {}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "state" {
  name     = "${var.prefix}-tfstate"
  location = local.location
}

# The application resource group is created here so the deploy identity's
# grants can be scoped to it; the main root adopts it by data source.
resource "azurerm_resource_group" "app" {
  name     = "${var.prefix}-rg"
  location = local.location
}

resource "azurerm_storage_account" "state" {
  name                            = local.state_account
  resource_group_name             = azurerm_resource_group.state.name
  location                        = azurerm_resource_group.state.location
  account_kind                    = "StorageV2"
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  shared_access_key_enabled       = false
  allow_nested_items_to_be_public = false
}

# Created through the management API: the account rejects shared-key
# access, which the data-plane container resource would need.
resource "azapi_resource" "state_container" {
  type      = "Microsoft.Storage/storageAccounts/blobServices/containers@2024-01-01"
  name      = "tfstate"
  parent_id = "${azurerm_storage_account.state.id}/blobServices/default"
}

# The person running Terraform reads and writes state with Entra auth.
resource "azurerm_role_assignment" "owner_state_blob" {
  scope                = "${azurerm_storage_account.state.id}/blobServices/default/containers/tfstate"
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = data.azuread_client_config.current.object_id
}

resource "azuread_application" "cd" {
  display_name     = "${var.prefix}-cd"
  sign_in_audience = "AzureADMyOrg"
}

resource "azuread_service_principal" "cd" {
  client_id = azuread_application.cd.client_id
}

# GitHub presents environment-scoped OIDC subjects in two forms: by name,
# and by the immutable owner and repository IDs. Both are trusted, for the
# production environment only.
resource "azuread_application_federated_identity_credential" "production" {
  application_id = azuread_application.cd.id
  display_name   = "github-production"
  description    = "GitHub Actions deploys from the production environment of ${var.github_repository}."
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = local.oidc_issuer
  subject        = "repo:${var.github_repository}:environment:production"
}

resource "azuread_application_federated_identity_credential" "production_ids" {
  application_id = azuread_application.cd.id
  display_name   = "github-production-ids"
  description    = "The numeric subject form for the production environment of ${var.github_repository}."
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = local.oidc_issuer
  subject        = "repo:${var.github_owner}@${var.github_owner_id}/${var.github_repository_name}@${var.github_repository_id}:environment:production"
}

# The deploy identity pushes images and updates the container app, nothing
# more: both roles are scoped to the application resource group.
resource "azurerm_role_assignment" "cd_container_apps" {
  scope                = azurerm_resource_group.app.id
  role_definition_name = "Container Apps Contributor"
  principal_id         = azuread_service_principal.cd.object_id
}

resource "azurerm_role_assignment" "cd_acr_push" {
  scope                = azurerm_resource_group.app.id
  role_definition_name = "AcrPush"
  principal_id         = azuread_service_principal.cd.object_id
}
