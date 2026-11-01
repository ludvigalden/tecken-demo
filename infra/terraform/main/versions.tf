terraform {
  required_version = ">= 1.9"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.7"
    }
    azapi = {
      source  = "Azure/azapi"
      version = "~> 2.13"
    }
  }

  # Remote state in the bootstrap account, named with -backend-config.
  backend "azurerm" {
    use_azuread_auth = true
    container_name   = "tfstate"
    key              = "main.tfstate"
  }
}

provider "azurerm" {
  features {}
  # The bootstrap root registers the providers this root needs.
  resource_provider_registrations = "none"
}
